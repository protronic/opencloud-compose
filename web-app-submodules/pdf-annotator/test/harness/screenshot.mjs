#!/usr/bin/env node
// Captures light/dark screenshots of the viewer for visual review.
// Usage: node test/harness/screenshot.mjs [outdir]
import {chromium} from 'playwright-core';

const outDir = process.argv[2] ?? '.';
const browser = await chromium.launch({
  executablePath: process.env.HARNESS_CHROMIUM ?? '/opt/pw-browsers/chromium',
});

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: {width: 1280, height: 800},
    colorScheme: scheme,
  });
  await page.goto('http://localhost:5299/', {waitUntil: 'networkidle'});
  await page.waitForSelector('.pdfViewer .page canvas', {timeout: 20000});
  await page.waitForTimeout(600);
  await page.screenshot({path: `${outDir}/pdf-annotator-${scheme}.png`});
  await page.close();
}

await browser.close();
console.log(`screenshots written to ${outDir}`);
