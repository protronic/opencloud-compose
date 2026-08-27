#!/usr/bin/env node
// Browser smoke test for the OpenCloud integration of src/App.vue.
//
// Prerequisites: `pnpm exec vite --config vite.harness.config.ts` (port 5301)
// and a Chromium binary (defaults to the Playwright-managed install).
//
// Drives the real UI: compiles the sample Typst document to a preview,
// edits the source and asserts the AppWrapper contract
// (update:currentContent + save).
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
  await page.goto('http://localhost:5301/', {waitUntil: 'networkidle'});

  // 1. Editor mounts with the sample source.
  await page.waitForSelector('.cm-content', {timeout: 20000});
  const source = await page.textContent('.cm-content');
  check(source?.includes('Testdokument'), 'editor should show the sample source');

  // 2. The WASM pipeline compiles the document to an SVG preview.
  await page.waitForSelector('.typst-preview svg', {timeout: 60000});
  const previewText = await page.textContent('.typst-preview');
  check(
    (previewText ?? '').replace(/\s+/g, '').includes('Testdokument'),
    'preview should render the heading text',
  );

  // 3. Editing emits updated content through the AppWrapper contract.
  await page.click('.cm-content');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\nNeuer Absatz aus dem Harness.');
  await page.waitForFunction(() => window.__harness.emitted.length > 0, null, {
    timeout: 15000,
  });
  const emitted = await page.evaluate(() => window.__harness.emitted.at(-1));
  check(
    emitted?.includes('Neuer Absatz aus dem Harness.'),
    'emitted content should include the typed text',
  );

  // 4. The preview follows the edit.
  await page.waitForFunction(
    () =>
      document
        .querySelector('.typst-preview')
        ?.textContent?.replace(/\s+/g, ' ')
        .includes('Neuer Absatz'),
    null,
    {timeout: 30000},
  );

  // 5. The save button triggers the wrapper save.
  await page.click('button[title="In OpenCloud speichern"]');
  await page.waitForFunction(() => window.__harness.saves > 0, null, {timeout: 10000});

  // 6. A syntax error surfaces in the error banner and recovers.
  await page.click('.cm-content');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n$ unclosed');
  await page.waitForSelector('.error-banner', {timeout: 30000});
  for (let i = 0; i < '\n$ unclosed'.length; i++) {
    await page.keyboard.press('Backspace');
  }
  await page.waitForFunction(
    () => !document.querySelector('.error-banner'),
    null,
    {timeout: 30000},
  );

  const errors = await page.evaluate(() => window.__harness.errors);
  check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
} catch (error) {
  problems.push(`harness run failed: ${error.message}`);
}

if (problems.length) {
  console.error(`✗ typst-editor harness\n  ${problems.join('\n  ')}`);
  console.error(consoleLines.slice(-30).join('\n'));
} else {
  console.log('✓ typst-editor harness: render, compile, edit, emit, save, error-recovery');
}

await browser.close();
process.exit(problems.length ? 1 : 0);
