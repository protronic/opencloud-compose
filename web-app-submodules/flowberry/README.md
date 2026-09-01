# flowBerry

OpenCloud-Web-Extension: reduzierter grafischer Logik-Editor auf Basis von
bpmn-js, der **Berry-Script** (`.be`) generiert. Gedacht als flussbasierte
Alternative zum blockberry-editor — näher an Relais-/Verknüpfungslogik als
Blockly, aber mit der schlanken BPMN-Optik.

## Bedienung

- Neue Datei über **+ Neu → flowBerry-Logik** (Endung `.flowberry`,
  Inhalt ist BPMN-2.0-XML mit `fb:*`-Attributen).
- Palette (von oben): Verschieben, Auswählen, Verbinden, dann die
  Logik-Elemente:

  | Element | Bedeutung |
  |---|---|
  | `‖` Schiene | Netzwerk-Start, logisch `true` |
  | `⊣⊢` Kontakt | UND-Verknüpfung mit `io_get("<Name>")` |
  | `⊣/⊢` Kontakt negiert | Öffner |
  | `●<` Verteiler | Verzweigung/Zusammenführung — parallele Zweige sind ODER |
  | TON / TOF | Ein-/Ausschaltverzögerung, Preset in ms |
  | `( )` Spule | Ausgang, `io_set("<Name>", …)` |

- **Doppelklick** auf Kontakt/Spule = Signalname setzen (oder rechts im
  Eigenschaften-Panel; dort auch Negiert und Timer-Preset).
- **Reihe = UND, parallel über Verteiler = ODER.** Selbsthaltung baut man wie
  an der SPS: ein Kontakt mit dem Namen der eigenen Ausgangs-Spule parallel
  zum Start-Kontakt. Direkte Kanten-Rückführungen im Graphen werden erkannt
  und mit Warnung als `false` ausgewertet.
- **Berry exportieren** legt `<name>.be` neben die `.flowberry`-Datei
  (WebDAV, wie der PDF-Export des typst-editors). **Code** blendet eine
  Live-Vorschau des generierten Scripts inkl. Warnungen ein.

## Generierter Code

Pro Export entsteht eine in sich geschlossene `.be`-Datei:

- `FB_TON` / `FB_TOF` — Timer zählen **Scan-Zyklen** (Preset ÷ `SCAN_MS`),
  keine Plattform-Uhr nötig; deterministisch und damit auch am PC testbar
  (läuft im Standard-Berry-Interpreter).
- `io_get`/`io_set` — Standard: einfache Map (`FB_IO`), zum Testen sofort
  lauffähig. Für Hardware die beiden Funktionen ersetzen (GPIO, Register,
  `tasmota.get_power()` …).
- `FlowBerryLogic.scan()` — erst alle Timer, dann alle Spulen; Rückführungen
  lesen den Wert des vorherigen Zyklus (klassisches SPS-Verhalten).
- Aufruf zyklisch, z. B. unter Tasmota per Cron/Driver (Hinweis steht im
  generierten File). `SCAN_MS` an die tatsächliche Aufrufrate anpassen.

## Build & Deployment

Standalone-App nach dem Muster von `typst-editor`:

```bash
cd web-app-submodules/flowberry
pnpm install
pnpm build          # -> dist/web (manifest.json + js/)
pnpm check:types
```

Deployment über das vorhandene Build-Script, nachdem flowberry in
`STANDALONE_PNPM_SUBMODULES` eingetragen ist (siehe
`flowberry-integration.patch` im Repo-Root dieser App):

```bash
./web-app-submodules/build-web-extensions.sh flowberry
```

Ergebnis landet in `OC_APPS_DIR/flowberry/` und wird wie gewohnt in den
OpenCloud-Container gemountet.

## Stand / offene Punkte

- Emitter ist gegen den echten Berry-Interpreter getestet (Selbsthaltung +
  TON-Beispiel, siehe `examples/selbsthaltung.flowberry`).
- Editor-UI ist gebaut und typgeprüft, aber noch nicht im laufenden
  OpenCloud durchgeklickt — Read-Only-Modus nutzt den BPMN-Viewer ohne
  Custom-Renderer (zeigt Rohform), bei Bedarf Renderer auch dort einhängen.
- Denkbare Ausbaustufen: Zähler (CTU/CTD), Flankenauswertung (R_TRIG),
  Set/Reset-Spulen, Netzwerk-Nummerierung im generierten Code nach
  Y-Position statt Element-ID.
