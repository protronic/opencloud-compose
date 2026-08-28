#!/usr/bin/env node
// Browser smoke test for the OpenCloud integration of src/App.vue.
//
// Prerequisites: the embedded app must be built
// (`pnpm exec vite build --config vite.app.config.ts`), then
// `pnpm exec vite --config vite.harness.config.ts` (port 5302) and a
// Chromium binary (defaults to the Playwright-managed install).
//
// Drives the real UI: loads a plain .typ through the bridge into the
// embedded WYSIWYG editor (iframe), edits it, and asserts the AppWrapper
// contract (update:currentContent + save) with valid Typst output.
import {chromium} from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HARNESS_CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({viewport: {width: 1400, height: 900}});
const consoleLines = [];
page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

try {
  await page.goto('http://localhost:5302/', {waitUntil: 'networkidle'});

  // 1. The embedded editor app boots inside the iframe and the bridge
  // delivers the document: the imported heading appears in the canvas.
  const frame = page.frameLocator('.editor-frame');
  await frame.locator('.ProseMirror').waitFor({timeout: 30000});
  await page.waitForFunction(
    () => !document.querySelector('.status-hint')?.textContent?.includes('Editor wird geladen'),
    null,
    {timeout: 30000},
  );
  const canvasText = await frame.locator('.ProseMirror').textContent();
  check(
    canvasText?.includes('Testdokument'),
    `imported document should show the heading, got "${canvasText?.slice(0, 120)}"`,
  );
  check(
    canvasText?.includes('Beispiel'),
    'imported document should show the paragraph text',
  );

  // 1b. Merely opening a document must not emit content (a fresh file
  // would otherwise immediately count as modified).
  await page.waitForTimeout(1600);
  const emittedOnOpen = await page.evaluate(() => window.__harness.emitted.length);
  check(emittedOnOpen === 0, `opening alone should not emit, got ${emittedOnOpen} emissions`);

  // 2. Editing in the canvas flows back through the bridge as Typst source.
  await frame.locator('.ProseMirror').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('Neuer Absatz aus dem Harness.');
  await page.waitForFunction(
    () => window.__harness.emitted.at(-1)?.includes('Neuer Absatz aus dem Harness.'),
    null,
    {timeout: 20000},
  );
  const emitted = await page.evaluate(() => window.__harness.emitted.at(-1));
  check(
    emitted?.includes('= Testdokument'),
    `emitted content should be Typst markup with the heading, got "${emitted?.slice(0, 160)}"`,
  );
  check(
    emitted?.includes('typst-wysiwyg-state'),
    'emitted content should carry the embedded editor state comment',
  );

  // 3. The wrapper save button requests the content and triggers save.
  await page.click('button[title="In OpenCloud speichern"]');
  await page.waitForFunction(() => window.__harness.saves > 0, null, {timeout: 10000});

  // 4. The live preview compiles with the bundled fonts (no CDN access in
  // this environment - a font fetch to jsdelivr would fail and leave the
  // preview empty).
  await frame.locator('.preview svg, .preview .page-svg svg').first().waitFor({timeout: 120000});

  const errors = await page.evaluate(() => window.__harness.errors);
  check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
} catch (error) {
  problems.push(`harness run failed: ${error.message}`);
}

if (problems.length) {
  console.error(`✗ typst-wysiwyg harness\n  ${problems.join('\n  ')}`);
  console.error(consoleLines.slice(-40).join('\n'));
} else {
  console.log('✓ typst-wysiwyg harness: boot, import, edit, emit, save, preview');
}

await browser.close();
process.exit(problems.length ? 1 : 0);
