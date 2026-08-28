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

  // 1. Existing documents open in the wiki reading mode: preview only,
  // compiled by the WASM pipeline, editor pane hidden.
  await page.waitForSelector('.typst-preview svg', {timeout: 60000});
  check(
    !(await page.locator('.editor-pane').isVisible()),
    'reading mode should hide the editor pane',
  );
  const previewText = await page.evaluate(
    () => document.querySelector('.typst-preview')?.shadowRoot?.textContent ?? '',
  );
  check(
    (previewText ?? '').replace(/\s+/g, '').includes('Testdokument'),
    'preview should render the heading text',
  );

  // 2. Switching to edit mode shows the CodeMirror source.
  await page.click('button:has-text("Bearbeiten")');
  await page.waitForSelector('.cm-content', {timeout: 20000});
  const source = await page.textContent('.cm-content');
  check(source?.includes('Testdokument'), 'editor should show the sample source');

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
        ?.shadowRoot?.textContent?.replace(/\s+/g, ' ')
        .includes('Neuer Absatz'),
    null,
    {timeout: 30000},
  );

  // 4b. The formatting toolbar wraps the selection and undo reverts it.
  await page.click('.cm-content');
  await page.keyboard.press('Control+End');
  await page.click('button[title="Fett"]');
  await page.waitForTimeout(200);
  const afterBold = await page.evaluate(() => document.querySelector('.cm-content')?.textContent ?? '');
  check(afterBold.includes('**'), 'bold button should insert asterisks');
  await page.click('button[title="Rückgängig"]');
  await page.waitForTimeout(200);
  const afterUndo = await page.evaluate(() => document.querySelector('.cm-content')?.textContent ?? '');
  check(!afterUndo.includes('**'), 'undo should revert the bold markers');

  // 4c. The preview zoom control scales the preview.
  await page.click('.preview-zoom button[title="Vergrößern"]');
  const zoomLabel = await page.textContent('.preview-zoom span');
  check(zoomLabel?.includes('120'), `zoom should show 120%, got "${zoomLabel}"`);
  await page.click('.preview-zoom button[title="Verkleinern"]');

  // 4d. PDF export writes the compiled PDF next to the .typ in OpenCloud.
  await page.click('button[title="Als PDF nach OpenCloud exportieren"]');
  await page.waitForFunction(() => window.__harness.pdfSaves.length > 0, null, {timeout: 30000});
  const pdfSave = await page.evaluate(() => window.__harness.pdfSaves.at(-1));
  check(pdfSave?.path === '/notizen.pdf', `pdf should land at /notizen.pdf, got "${pdfSave?.path}"`);
  const pdfHead = String.fromCharCode(...(pdfSave?.head ?? []));
  check(pdfHead === '%PDF-', `pdf content should start with %PDF-, got "${pdfHead}"`);
  check((pdfSave?.size ?? 0) > 1000, `pdf suspiciously small: ${pdfSave?.size} bytes`);

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

  // 6b. The preview styles must not leak into the host document: an icon
  // svg outside the app keeps its fill (the reported disappearing close X).
  const iconVisible = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.innerHTML =
      '<svg id="host-icon-probe" width="16" height="16"><path d="M2 2 L14 14 M14 2 L2 14"/></svg>';
    document.body.append(probe);
    const path = probe.querySelector('path');
    const fill = path ? getComputedStyle(path).fill : 'missing';
    const svgFill = getComputedStyle(probe.querySelector('svg')).fill;
    probe.remove();
    return {fill, svgFill};
  });
  check(
    iconVisible.svgFill !== 'none',
    `typst styles must not leak (host svg fill is "${iconVisible.svgFill}")`,
  );

  // 6c. A real mouse click on the wiki link (hit-testing through the shadow
  // DOM) navigates via the mocked router bridge; the mock swaps in an empty
  // "new page", which must open in edit mode.
  const linkBox = await page.evaluate(() => {
    const shadow = document.querySelector('.typst-preview')?.shadowRoot;
    const anchors = [...(shadow?.querySelectorAll('a') ?? [])];
    const hrefOf = (a) => a.getAttribute('href') ?? a.getAttribute('xlink:href') ?? '';
    const wiki = anchors.find((a) => hrefOf(a).includes('zweite-seite'));
    if (!wiki) return {count: anchors.length};
    const rect = wiki.getBoundingClientRect();
    return {
      count: anchors.length,
      href: hrefOf(wiki),
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  });
  check(
    linkBox.href !== undefined,
    `preview should contain the wiki link (found ${linkBox.count} links)`,
  );
  if (linkBox.href !== undefined) {
    await page.mouse.click(linkBox.x, linkBox.y);
  }
  await page.waitForFunction(() => window.__harness.wikiNav.length > 0, null, {timeout: 5000});
  const nav = await page.evaluate(() => window.__harness.wikiNav.at(-1));
  check(nav?.space === 'space-1', `wiki nav should carry the space, got "${nav?.space}"`);
  check(
    nav?.to === '/zweite-seite.typ',
    `wiki nav target should resolve to /zweite-seite.typ, got "${nav?.to}"`,
  );
  await page.waitForTimeout(500);
  check(
    await page.locator('.editor-pane').isVisible(),
    'empty new wiki page should open in edit mode',
  );
  const newPageSource = await page.evaluate(
    () => document.querySelector('.cm-content')?.textContent ?? 'missing',
  );
  check(
    newPageSource.trim() === '',
    `new wiki page should start empty, got "${newPageSource.slice(0, 60)}"`,
  );

  // 7. Remounting (second open) must not throw on the shared singleton;
  // the fresh instance starts in reading mode again.
  await page.evaluate(() => window.__remount());
  await page.waitForSelector('.typst-preview svg', {timeout: 60000});
  await page.click('button:has-text("Bearbeiten")');
  await page.waitForSelector('.cm-content', {timeout: 20000});

  const errors = await page.evaluate(() => window.__harness.errors);
  check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
} catch (error) {
  problems.push(`harness run failed: ${error.message}`);
}

if (problems.length) {
  console.error(`✗ typst-editor harness\n  ${problems.join('\n  ')}`);
  console.error(consoleLines.slice(-30).join('\n'));
} else {
  console.log('✓ typst-editor harness: render, compile, view-toggle, edit, format, zoom, pdf, emit, save, error-recovery, wiki-link, wiki-new-page, remount');
}

await browser.close();
process.exit(problems.length ? 1 : 0);
