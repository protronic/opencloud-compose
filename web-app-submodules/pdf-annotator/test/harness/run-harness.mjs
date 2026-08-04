#!/usr/bin/env node
// Browser smoke test for the OpenCloud integration of src/App.vue.
//
// Prerequisites: `pnpm exec vite --config vite.harness.config.ts` (port 5299)
// and a Chromium binary (defaults to the Playwright-managed install).
//
// Drives the real UI: renders a sample PDF, adds a FreeText note with mouse
// and keyboard, and asserts that the app emits the annotated PDF through the
// AppWrapper contract (update:currentContent + save).
import {chromium} from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HARNESS_CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({viewport: {width: 1280, height: 900}});
const consoleLines = [];
page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

try {
  await page.goto('http://localhost:5299/', {waitUntil: 'networkidle'});

  // 1. The sample PDF renders through the AppWrapper-style props.
  await page.waitForSelector('.pdfViewer .page canvas', {timeout: 20000});
  const pageCount = await page.textContent('.page-count');
  check(
    pageCount?.includes('von 2'),
    `page count should show "von 2", got "${pageCount}"`,
  );
  check(
    (await page.locator('.save-button').count()) === 0,
    'toolbar must not contain a save button (OpenCloud top bar saves)',
  );

  // 2. Add a FreeText note via toolbar + click + keyboard.
  await page.click('button[title="Textnotiz einfügen"]');
  await page.waitForTimeout(300);
  const pdfPage = page.locator('.pdfViewer .page').first();
  await pdfPage.click({position: {x: 320, y: 240}});
  await page.keyboard.type('Prüfvermerk Protronic');
  // Blur commits the free text editor.
  await page.click('button[title="Auswahlwerkzeug"]');

  // 3. Wait for the debounced commit to emit the annotated PDF.
  await page.waitForFunction(() => window.__harness.emitted.length > 0, null, {
    timeout: 15000,
  });
  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => window.__harness);
  check(state.emitted.length > 0, 'no update:currentContent emission received');
  const last = state.emitted[state.emitted.length - 1];
  const head = String.fromCharCode(...(last?.head ?? []));
  check(head === '%PDF-', `emitted bytes should start with %PDF-, got "${head}"`);
  check(
    (last?.length ?? 0) > 500,
    `emitted PDF suspiciously small: ${last?.length} bytes`,
  );

  // 4. The emitted bytes parse as a PDF and contain the FreeText annotation.
  const verification = await page.evaluate(() => window.__verifyEmitted());
  check(verification.numPages === 2, `emitted PDF should keep 2 pages, got ${verification.numPages}`);
  check(
    verification.annotationSubtypes.includes('FreeText'),
    `emitted PDF should contain a FreeText annotation, got [${verification.annotationSubtypes.join(', ')}]`,
  );

  // 5. Draw an ink stroke and attach a comment via the editor toolbar
  // (free text carries its content itself; comments exist for highlight,
  // ink and stamp annotations, matching the pdf.js viewer).
  await page.click('button[title="Freihand zeichnen"]');
  await page.waitForTimeout(300);
  const inkBox = await page.locator('.pdfViewer .page').first().boundingBox();
  await page.mouse.move(inkBox.x + 200, inkBox.y + 420);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++) {
    await page.mouse.move(inkBox.x + 200 + step * 14, inkBox.y + 420 + (step % 2 ? 12 : -12));
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  // Leaving the mode commits the stroke; re-entering makes editors selectable.
  await page.click('button[title="Auswahlwerkzeug"]');
  await page.waitForTimeout(400);
  await page.click('button[title="Freihand zeichnen"]');
  await page.waitForTimeout(400);
  await page.locator('.inkEditor').first().click();
  await page.waitForSelector('.editToolbar button.comment', {timeout: 5000});
  await page.click('.editToolbar button.comment');
  await page.waitForSelector('.pdfa-comment-dialog', {timeout: 5000});
  await page.fill('.pdfa-comment-text', 'Bitte bis Freitag prüfen');
  await page.click('.pdfa-comment-save');
  await page.click('button[title="Auswahlwerkzeug"]');
  const emittedBefore = await page.evaluate(() => window.__harness.emitted.length);
  await page.waitForFunction(
    (count) => window.__harness.emitted.length > count,
    emittedBefore - 1,
    {timeout: 15000},
  );
  await page.waitForTimeout(2000);
  const commented = await page.evaluate(() => window.__verifyEmitted());
  check(
    commented.annotationContents.some((entry) => entry.includes('Bitte bis Freitag prüfen')),
    `emitted PDF should carry the comment text, got [${commented.annotationContents.join(' | ')}]`,
  );

  // 6. The pdf.js-style zoom select drives the viewer scale.
  await page.selectOption('.zoom-select', '1');
  await page.waitForTimeout(400);
  const zoomValue = await page.inputValue('.zoom-select');
  check(zoomValue === '1', `zoom select should hold "1" (100 %), got "${zoomValue}"`);

  const errors = await page.evaluate(() => window.__harness.errors);
  check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
} catch (error) {
  problems.push(`harness run failed: ${error.message}`);
}

if (problems.length) {
  console.error(`✗ pdf-annotator harness\n  ${problems.join('\n  ')}`);
  console.error(consoleLines.join('\n'));
} else {
  console.log('✓ pdf-annotator harness: render, annotate, comment, emit, verify, zoom');
}

await browser.close();
process.exit(problems.length ? 1 : 0);
