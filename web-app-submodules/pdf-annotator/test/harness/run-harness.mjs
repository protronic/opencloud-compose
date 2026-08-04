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

  // 5. The pdf.js-style zoom select drives the viewer scale.
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
  console.log('✓ pdf-annotator harness: render, annotate, emit, verify, zoom');
}

await browser.close();
process.exit(problems.length ? 1 : 0);
