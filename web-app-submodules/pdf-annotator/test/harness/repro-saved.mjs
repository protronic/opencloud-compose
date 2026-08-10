#!/usr/bin/env node
// Reproduces the displaced-icon bug with SAVED annotations: create highlight
// + ink with comments, save, reload the saved PDF, then enter edit mode.
import {chromium} from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5299/';
const outDir = process.argv[3] ?? '.';
const browser = await chromium.launch({
  executablePath: process.env.HARNESS_CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({viewport: {width: 1280, height: 900}});
page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

await page.goto(url, {waitUntil: 'networkidle'});
await page.waitForSelector('.pdfViewer .page canvas', {timeout: 20000});
await page.waitForTimeout(500);

// --- Phase 1: create a text highlight with a comment.
await page.click('button[title="Text markieren"]');
await page.waitForTimeout(300);
const span = page.locator('.textLayer span').first();
const sb = await span.boundingBox();
await page.mouse.move(sb.x + 2, sb.y + sb.height / 2);
await page.mouse.down();
await page.mouse.move(sb.x + sb.width * 0.6, sb.y + sb.height / 2, {steps: 10});
await page.mouse.up();
await page.waitForTimeout(600);
await page.click('.editToolbar:not(.hidden) button.comment');
await page.waitForSelector('.pdfa-comment-dialog', {timeout: 5000});
await page.fill('.pdfa-comment-text', 'Kommentar zur Markierung');
await page.click('.pdfa-comment-save');
await page.waitForTimeout(400);

// --- Also an ink stroke with comment.
await page.click('button[title="Freihand zeichnen"]');
await page.waitForTimeout(300);
const box = await page.locator('.pdfViewer .page').first().boundingBox();
await page.mouse.move(box.x + 180, box.y + 320);
await page.mouse.down();
for (let s = 1; s <= 8; s++) {
  await page.mouse.move(box.x + 180 + s * 12, box.y + 320 + (s % 2 ? 10 : -10));
}
await page.mouse.up();
await page.waitForTimeout(300);
await page.click('button[title="Auswahlwerkzeug"]');
await page.waitForTimeout(400);
await page.click('button[title="Freihand zeichnen"]');
await page.waitForTimeout(300);
await page.locator('.inkEditor').first().click();
await page.waitForSelector('.editToolbar:not(.hidden) button.comment', {timeout: 5000});
await page.click('.editToolbar:not(.hidden) button.comment');
await page.waitForSelector('.pdfa-comment-dialog', {timeout: 5000});
await page.fill('.pdfa-comment-text', 'Kommentar zur Zeichnung');
await page.click('.pdfa-comment-save');
await page.click('button[title="Auswahlwerkzeug"]');

// --- Wait for the debounced save.
await page.waitForFunction(() => window.__harness.emitted.length > 0, null, {timeout: 15000});
await page.waitForTimeout(2500);

// --- Phase 2: reload the saved PDF (fresh buffer) - simulates re-opening.
await page.evaluate(() => window.__loadPdf(window.__lastEmittedBytes()));
await page.waitForTimeout(1500);
await page.waitForSelector('.pdfViewer .page canvas', {timeout: 20000});
await page.screenshot({path: `${outDir}/saved-view-mode.png`});

// --- Phase 3: enter edit mode (highlight tool), like the user did.
await page.click('button[title="Text markieren"]');
await page.waitForTimeout(1200);
await page.screenshot({path: `${outDir}/saved-edit-mode.png`});

const dump = await page.evaluate(() => {
  const out = [];
  const record = (el, label) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      label,
      cls: String(el.className).slice(0, 50),
      layer: el.closest('.annotationEditorLayer')
        ? 'editorLayer'
        : el.closest('.annotationLayer')
          ? 'annotationLayer'
          : el.closest('.textLayer')
            ? 'textLayer'
            : '?',
      rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
      position: cs.position,
      top: cs.top,
      inlineTop: el.style.top,
      inlineInsetEnd: el.style.insetInlineEnd,
    });
  };
  document.querySelectorAll('.annotationCommentButton').forEach((el) => record(el, 'commentBtn'));
  document.querySelectorAll('.editToolbar').forEach((el) => record(el, 'toolbar'));
  document
    .querySelectorAll('.highlightEditor, .inkEditor')
    .forEach((el) => record(el, 'editor'));
  return out;
});
for (const e of dump) console.log(JSON.stringify(e));

// --- Phase 4: select the reloaded highlight editor -> toolbar appears.
await page.locator('.highlightEditor').first().click();
await page.waitForTimeout(800);
await page.screenshot({path: `${outDir}/saved-selected.png`});
const tb = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.editToolbar').forEach((el) => {
    const r = el.getBoundingClientRect();
    out.push({cls: 'toolbar', hidden: el.classList.contains('hidden'), rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}, inlineTop: el.style.top, inlineInsetEnd: el.style.insetInlineEnd});
    el.querySelectorAll('.buttons > *').forEach((b) => {
      const br = b.getBoundingClientRect();
      const before = getComputedStyle(b, '::before');
      out.push({cls: String(b.className).slice(0, 40), rect: {x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height)}, mask: (before.webkitMaskImage || 'none').slice(0, 20), fg: before.backgroundColor});
    });
  });
  return out;
});
for (const e of tb) console.log(JSON.stringify(e));
await browser.close();
// --- Phase 4 (appended): select the highlight editor, dump toolbar geometry.
