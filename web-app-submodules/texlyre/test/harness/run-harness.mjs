#!/usr/bin/env node
// Browser test of the OpenCloud integration: src/App.vue + TeXlyre (dist/web/app)
// + mocked WebDAV (test/harness/main.ts), served with the OpenCloud CSP.
//
//   pnpm build            # wrapper + TeXlyre (dist/web, dist/web/app)
//   pnpm harness          # Vite on port 5303
//   node test/harness/run-harness.mjs
//
// Checks: the folder of the opened file becomes a TeXlyre project (sign-in and
// project creation without dialogs), the document compiles (preview), typing
// is written back to OpenCloud, a change made elsewhere in OpenCloud shows up.
import {chromium} from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HARNESS_CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};
const blocked = [];
page.on('console', (msg) => {
  const text = msg.text();
  // collaboration (WebRTC signaling) and the upstream status page are
  // external services the OpenCloud CSP blocks on purpose
  if (/Refused to connect/.test(text) && !/ywebrtc\.texlyre\.org|upptime/.test(text)) blocked.push(text.slice(0, 200));
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

const fsText = (path) =>
  page.evaluate((p) => new TextDecoder().decode(window.__fs.get(p)?.data ?? new ArrayBuffer(0)), path);
const waitFor = async (predicate, timeout, what) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await predicate()) return true;
    await page.waitForTimeout(500);
  }
  problems.push(`timeout: ${what}`);
  return false;
};

try {
  await page.goto(process.env.HARNESS_URL ?? 'http://localhost:5303/', {waitUntil: 'load'});

  // 1. ready: overlay gone, TeXlyre shows the project of the folder
  await page.waitForSelector('.texlyre-overlay', {state: 'detached', timeout: 60000});
  const frame = page.frames().find((f) => f.url().includes('/assets/apps/texlyre/app/'));
  check(!!frame, 'TeXlyre iframe missing');
  await frame.waitForSelector('.cm-content', {timeout: 30000});
  const body = await frame.evaluate(() => document.body.innerText);
  check(body.includes('Bericht'), 'project should be named after the folder');
  check(body.includes('kapitel.typ') && body.includes('bilder'), 'folder files should be listed');
  check(!body.includes('Anderes.typ'), 'files outside the folder must not be imported');

  // 2. compiles: the preview shows a rendered page
  await waitFor(
    () =>
      frame.evaluate(() =>
        [...document.querySelectorAll('.canvas-page canvas, .canvas-page svg')].some(
          (el) => el.getBoundingClientRect().width > 100,
        ),
      ),
    45000,
    'compiled preview',
  );

  // 3. typing is written back via WebDAV
  await frame.click('.cm-content');
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\nNeuer Absatz aus TeXlyre.');
  await waitFor(
    async () => (await fsText('/Dokumente/Bericht/main.typ')).includes('Neuer Absatz aus TeXlyre.'),
    15000,
    'write-back of main.typ',
  );

  // 4. change made elsewhere in OpenCloud to a file that is not open shows up
  //    (folder poll every 10 s); open tabs are not refreshed by TeXlyre
  await page.evaluate(() => {
    window.__fs.set('/Dokumente/Bericht/kapitel.typ', {
      data: new TextEncoder().encode('#let gruss = [Extern geändert.]\n').buffer,
      mtime: Date.now() + 5000,
    });
  });
  await page.waitForTimeout(15000);
  await frame.click('text=kapitel.typ');
  await waitFor(
    () => frame.evaluate(() => document.querySelector('.cm-content')?.textContent?.includes('Extern geändert') ?? false),
    30000,
    'external change in kapitel.typ',
  );

  if (process.env.HARNESS_SHOT) await page.screenshot({path: process.env.HARNESS_SHOT});

  const calls = await page.evaluate(() => window.__harness.calls);
  check(
    calls.every(([, path]) => path.startsWith('/Dokumente/Bericht')),
    `WebDAV access outside the folder: ${JSON.stringify(calls.filter(([, p]) => !p.startsWith('/Dokumente/Bericht')))}`,
  );
  check(blocked.length === 0, `CSP blocked requests: ${blocked.join(' | ')}`);
} catch (err) {
  problems.push(`aborted: ${err.stack ?? err}`);
}

await browser.close();
if (problems.length) {
  console.error(`FAILED (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Harness OK');
