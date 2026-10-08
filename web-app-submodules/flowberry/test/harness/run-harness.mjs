#!/usr/bin/env node
// Browser-Test der OpenCloud-Einbindung von src/App.vue.
//
// Voraussetzung: `pnpm exec vite --config vite.harness.config.ts` (Port 5302)
// und Chromium (Standard: die Playwright-Installation unter /opt/pw-browsers).
//
// Bedient die echte Oberfläche mit dem Bild-Beispiel examples/notstrom.flowberry:
// Auswahl, Bearbeiten, Rückgängig, Fehleranzeige, Anhängen über die Palette,
// Einfügen in eine Verbindung per Drag & Drop, Simulation, Berry-Export und
// den AppWrapper-Vertrag (update:currentContent, save).
import {chromium} from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HARNESS_CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const consoleLines = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') consoleLines.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};
const node = (id) => page.locator(`.vue-flow__node[data-id="${id}"]`);
const code = () => page.locator('.fb-codepanel__code').innerText();
const lastEmitted = () => page.evaluate(() => window.__harness.emitted.at(-1) ?? '');
const nodeCount = () => page.locator('.vue-flow__node').count();
const edgePairs = () =>
  page.evaluate(() => JSON.parse(window.__harness.emitted.at(-1) ?? '{"edges":[]}').edges.map((e) => `${e.source}>${e.target}`));

try {
  await page.goto(process.env.HARNESS_URL ?? 'http://localhost:5302/', {waitUntil: 'networkidle'});
  await page.waitForSelector('.vue-flow__node[data-id="netz"]');

  // 1. Laden: alle Elemente, Code daneben, Status ohne Fehler
  check((await nodeCount()) === 10, `10 Elemente erwartet, ${await nodeCount()} gefunden`);
  check((await code()).includes('class FlowBerryLogic'), 'Code-Panel zeigt keine Klasse FlowBerryLogic');
  check((await code()).includes('self.get("MPS_IN")'), 'Code fragt MPS_IN nicht ab');
  check((await page.locator('.fb-status').innerText()).includes('10 Schritte'), 'Status sollte 10 Schritte melden');

  // 2. Auswahl: Eigenschaften und hervorgehobener Code-Abschnitt
  await node('sps_ein').click();
  await page.waitForSelector('.fb-props textarea');
  check((await page.inputValue('.fb-props textarea')) === 'SPS = 1', 'Aktion sollte "SPS = 1" zeigen');
  const highlighted = await page.locator('.fb-codepanel__line--hl').allInnerTexts();
  check(highlighted.some((l) => l.includes('self.set("SPS", true)')), 'gewählter Schritt sollte im Code markiert sein');

  // 3. Bearbeiten → update:currentContent und neuer Code (Zähler)
  await page.fill('.fb-props textarea', 'SPS = 1\nZAEHLER = ZAEHLER + 1');
  await page.waitForFunction(() => (window.__harness.emitted.at(-1) ?? '').includes('ZAEHLER + 1'), null, {timeout: 5000});
  check(
    (await code()).includes('self.set("ZAEHLER", int(self.get("ZAEHLER")) + 1)'),
    'Zähler-Zuweisung fehlt im Code'
  );

  // Backspace im Textfeld löscht Zeichen, nicht das Element
  await page.focus('.fb-props textarea');
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  check((await node('sps_ein').count()) === 1, 'Backspace im Textfeld darf das Element nicht löschen');
  await page.keyboard.type('1');

  // 4. Rückgängig (Strg+Z außerhalb von Eingabefeldern)
  await page.locator('.vue-flow__pane').click({position: {x: 40, y: 40}});
  await page.keyboard.press('Control+z');
  await page.waitForFunction(() => !(window.__harness.emitted.at(-1) ?? '').includes('ZAEHLER'), null, {timeout: 5000});
  check(!(await code()).includes('ZAEHLER'), 'Rückgängig sollte den Zähler entfernen');

  // 5. Syntaxfehler wird am Element und in der Statuszeile angezeigt
  await node('netz').click();
  await page.fill('.fb-props input[list="fb-signal-list"]', 'MPS_IN &');
  await page.waitForSelector('.vue-flow__node[data-id="netz"] .fb-node--error');
  check((await page.locator('.fb-status').innerText()).includes('Fehler'), 'Status sollte den Fehler melden');
  await page.fill('.fb-props input[list="fb-signal-list"]', 'MPS_IN = 1');
  await page.waitForSelector('.vue-flow__node[data-id="netz"] .fb-node--error', {state: 'detached'});

  // 6. Palette-Klick mit gewähltem Element ohne Nachfolger hängt an und verbindet
  await node('last').click();
  await page.click('.fb-palette__item:has-text("ENDE")');
  await page.waitForFunction(() => document.querySelectorAll('.vue-flow__node').length === 11);
  await page.waitForTimeout(200);
  check((await edgePairs()).some((p) => p.startsWith('last>')), 'ENDE sollte an "OPL = 1" angehängt sein');

  // 7. Drag & Drop aus der Palette auf eine Verbindung fügt das Element ein
  const dropPoint = await page.evaluate(() => {
    const path = document.querySelector('.vue-flow__edge[data-id="e-dgs_ein-sps_aus"] path.vue-flow__edge-path');
    const p = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(path.getScreenCTM());
    return {x: p.x, y: p.y};
  });
  const pane = await page.locator('.vue-flow__pane').boundingBox();
  await page.dragAndDrop('.fb-palette__item:has-text("Warten")', '.vue-flow__pane', {
    targetPosition: {x: dropPoint.x - pane.x, y: dropPoint.y - pane.y},
  });
  await page.waitForFunction(() => document.querySelectorAll('.vue-flow__node').length === 12);
  await page.waitForTimeout(300);
  const pairs = await edgePairs();
  check(!pairs.includes('dgs_ein>sps_aus'), 'alte Verbindung dgs_ein → sps_aus sollte ersetzt sein');
  check(
    pairs.some((p) => p.startsWith('dgs_ein>n')) && pairs.some((p) => p.endsWith('>sps_aus')),
    `Warten sollte zwischen dgs_ein und sps_aus liegen: ${pairs.join(', ')}`
  );
  await page.keyboard.press('Control+z');
  await page.waitForFunction(() => document.querySelectorAll('.vue-flow__node').length === 11);

  // 8. Simulation: Netz fehlt → Anlasser-Impuls; Netz + Generator da → Last an, SPS aus
  await page.click('.fb-tabs button:has-text("Simulation")');
  await page.waitForSelector('.fb-sim');
  const inputs = await page.locator('.fb-sim__row .fb-sim__name').allInnerTexts();
  check(inputs.includes('MPS_IN') && inputs.includes('DGS_IN'), `Eingänge MPS_IN/DGS_IN erwartet: ${inputs}`);
  await page.click('.fb-sim__run');
  await page.waitForSelector('.vue-flow__node[data-id="anlasser"] .fb-node--active', {timeout: 3000});
  const lamp = (name) => page.locator(`.fb-sim__row:has(.fb-sim__name:text-is("${name}")) .fb-sim__lamp`);
  check(await lamp('DGSS').evaluate((el) => el.classList.contains('on')), 'DGSS sollte während des Impulses leuchten');
  if (process.env.HARNESS_SHOT) {
    await page.screenshot({path: process.env.HARNESS_SHOT});
  }
  await page.selectOption('.fb-sim__speed select', '20');
  // nach dem Impuls zählt laut Plan nur DGS_IN; Netz und Generator melden sich zurück
  await page.click('.fb-sim__row:has(.fb-sim__name:text-is("MPS_IN")) .fb-sim__switch');
  await page.click('.fb-sim__row:has(.fb-sim__name:text-is("DGS_IN")) .fb-sim__switch');
  await page.waitForFunction(
    () => document.querySelector('.vue-flow__node[data-id="anlasser"] .fb-node--active') === null,
    null,
    {timeout: 5000}
  );
  await page.waitForTimeout(200);
  check(await lamp('OPL').evaluate((el) => el.classList.contains('on')), 'OPL sollte bei Netz an sein');
  check(!(await lamp('SPS').evaluate((el) => el.classList.contains('on'))), 'SPS sollte bei Netz aus sein');
  await page.click('.fb-sim__run');

  // 9. Berry-Export neben die Datei, Strg+S speichert
  await page.click('.fb-toolbar__primary');
  await page.waitForFunction(() => window.__harness.siblings.length === 1, null, {timeout: 5000});
  const sibling = await page.evaluate(() => window.__harness.siblings[0]);
  check(sibling.path === '/steuerung/notstrom.be', `Export-Pfad falsch: ${sibling.path}`);
  check(sibling.content.includes('class FlowBerryLogic'), 'exportiertes Script unvollständig');
  await page.keyboard.press('Control+s');
  check((await page.evaluate(() => window.__harness.saves)) === 1, 'Strg+S sollte save auslösen');

  // 10. Altes BPMN-Format: Hinweis statt Absturz
  await page.evaluate(() => window.__load('<?xml version="1.0"?><bpmn:definitions/>'));
  await page.waitForSelector('.fb-banner');

  // 11. Nur-Lesen: keine Palette, kein Export
  await page.evaluate(() => window.__load(window.__examples.zaehler, true));
  await page.waitForSelector('.vue-flow__node[data-id="voll"]');
  check((await page.locator('.fb-palette').count()) === 0, 'Nur-Lesen sollte die Palette ausblenden');
  check((await page.locator('.fb-toolbar__primary').count()) === 0, 'Nur-Lesen sollte keinen Export anbieten');

  const errors = await page.evaluate(() => window.__harness.errors);
  check(errors.length === 0, `Fehler im Browser: ${errors.join(' | ')}`);
} catch (err) {
  problems.push(`Abbruch: ${err.stack ?? err}`);
}

await browser.close();

if (consoleLines.length) {
  console.log(consoleLines.join('\n'));
}
if (problems.length) {
  console.error(`FEHLGESCHLAGEN (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Harness OK');
