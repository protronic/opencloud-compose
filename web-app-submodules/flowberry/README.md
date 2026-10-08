# flowBerry

OpenCloud-Web-Extension: grafischer Editor für **Programmablaufpläne (PAP)**
einfacher SPS-Steuerungen, der daraus ein lauffähiges **Berry-Script** (`.be`)
erzeugt – live in der Seitenleiste und als Datei neben dem Plan. Gedacht für
Abläufe in der Größenordnung „Netz weg → Generator starten → Last umschalten“:
START, Eingänge lesen, Entscheidungen, Ausgänge setzen, Zeiten, Rücksprünge.

Basis ist [Vue Flow](https://vueflow.dev) (MIT, Vue 3 – wie OpenCloud selbst).

## Bedienung

- Neue Datei über **+ Neu → flowBerry-Ablaufplan** (Endung `.flowberry`).
- **Palette** links: Element auf die Fläche ziehen oder anklicken. Ist ein
  Element ausgewählt, das noch keinen Nachfolger hat, wird das neue darunter
  angehängt und verbunden – so entsteht ein Ablauf Klick für Klick.
  Fällt ein Element auf eine Verbindung, wird es dort eingefügt.
- **Verbinden:** an einem der vier Anschlüsse eines Elements ziehen. Die
  Ablaufrichtung geht vom Start der Verbindung zum Pfeil.
- **Entscheidungen** haben die Ausgänge **1** (Bedingung erfüllt) und **0**.
  Der erste Ausgang wird 1, der zweite 0; Doppelklick auf eine Verbindung
  tauscht die Zweige.
- **Doppelklick** auf ein Element springt in das Eigenschaften-Feld rechts.
- **Entf** löscht, **Strg+Z / Strg+Y** macht rückgängig/wiederholt,
  **Strg+S** speichert.

| Element | Symbol | Bedeutung |
|---|---|---|
| START | Terminator | Einsprung. Nach ENDE geht es hier wieder los (SPS-Zyklus) |
| Eingabe | Parallelogramm | dokumentiert gelesene Eingänge („Lese MPS & DGS“) |
| Entscheidung | Raute | Bedingung, z. B. `MPS = 1`, `START & !STOP`, `N >= 5` |
| Aktion | Rechteck | Zuweisungen, eine pro Zeile: `SPS = 1`, `N = N + 1` |
| Impuls | Rechteck mit Doppelrand | Ausgang für eine Zeit auf 1, danach 0 („DGSS = 1 für 3 s“) |
| Warten | Rechteck mit Doppelrand | Zeit abwarten oder warten, bis eine Bedingung erfüllt ist |
| ENDE | Terminator | zurück zu START oder anhalten |

Ein Element ohne Nachfolger wirkt wie ENDE (zurück zu START).

### Ausdrücke

| Schreibweise | Bedeutung |
|---|---|
| `A = 1`, `A == 0` | prüfen (in Entscheidungen) bzw. setzen (in Aktionen) |
| `!A`, `nicht A`, `not A` | Negation |
| `A & B`, `A && B`, `A und B` | UND |
| `A \| B`, `A \|\| B`, `A oder B` | ODER |
| `N = N + 1`, `N - 1` | Zähler |
| `N >= 5`, `N <> 0`, `N != 0`, `<`, `<=`, `>` | Vergleich |

Signalnamen: Buchstaben, Ziffern, `_`, `.` und `%` (z. B. `E0.1`, `%IX0.1`).
Signale, die nur gelesen werden, gelten als Eingänge; alle geschriebenen als
Ausgänge/Merker. Was gerechnet oder größer/kleiner verglichen wird, wird als
Zahl geführt (Zähler), alles andere als Bit.

## Seitenleiste

- **Berry-Code** – das generierte Script, live. Das ausgewählte Element ist im
  Code markiert. **Fenster ↗** öffnet den Code in einem eigenen Fenster (z. B.
  auf dem zweiten Bildschirm), das sich bei jeder Änderung mitaktualisiert.
  **Speichern als .be** legt `<name>.be` neben die `.flowberry`-Datei (WebDAV).
- **Simulation** – führt den Ablauf im Browser aus: Eingänge als Schalter oder
  Taster, Ausgänge als Lampen, aktiver Schritt und Zeitfortschritt im Diagramm,
  Zeitraffer 1×/5×/20×. Die Simulation verwendet dasselbe Schrittprogramm wie
  der Berry-Code und verhält sich Zyklus für Zyklus gleich (siehe Tests).
- **Prüfung** – Fehler (Syntax, fehlender START, …) und Hinweise (fehlender
  Zweig, nicht verbundene Elemente). Betroffene Elemente sind im Diagramm
  gestrichelt umrandet; Klick auf eine Meldung springt hin.

## Generierter Code

Pro Export entsteht eine in sich geschlossene `.be`-Datei:

- `io_get` / `io_set` – E/A-Anbindung, Standard ist eine Map (`FB_IO`), zum
  Testen sofort lauffähig. Für Hardware die beiden Funktionen ersetzen
  (`gpio.digital_read`, `tasmota.get_power()`, `tasmota.set_power()` …).
- `FlowBerryLogic` – Schrittkette; Schrittnummern stehen auch im Diagramm.
  `scan()` ist ein SPS-Zyklus nach dem EVA-Prinzip:
  1. Signale werden beim ersten Zugriff im Zyklus gelesen (Prozessabbild),
  2. die Schritte laufen, bis einer wartet (Impuls, Warten) oder ein Schritt im
     selben Zyklus ein zweites Mal drankäme (Schleife im Plan) – dann geht es
     im nächsten Zyklus mit frisch gelesenen Eingängen weiter,
  3. geänderte Ausgänge gehen erst am Zyklusende per `io_set` hinaus – kein
     Flackern, wenn ein Zyklus einen Ausgang aus- und wieder einschaltet, und
     unter Tasmota kein Schalten (MQTT) in jedem Zyklus.
- Zeiten zählen Zyklen (`SCAN_MS` je `scan()`), keine Plattform-Uhr nötig;
  deterministisch und damit auch im Standard-Berry-Interpreter am PC testbar.
  Die Zykluszeit (50/100/250/1000 ms) wird in der Werkzeugleiste gewählt; der
  Hinweis am Dateiende zeigt den passenden Tasmota-Driver (`every_50ms` …).
- `restart()` setzt den Ablauf auf START zurück (auch nach ENDE „anhalten“).

## Dateiformat

`.flowberry` ist JSON (`"flowberry": 2`) mit Knoten, Kanten und Einstellungen –
lesbar und gut zu diffen. Beispiele in `examples/`:

- `notstrom.flowberry` – das Beispiel aus der Aufgabenstellung (Netzausfall →
  Generator starten → Last umschalten)
- `selbsthaltung.flowberry` – Selbsthaltung als Verknüpfung in einer Aktion
- `zaehler.flowberry` – Teile zählen, nach 5 Stück Auswerfer-Impuls

Dateien der Version 0.1 (BPMN-XML aus dem bpmn-js-Kontaktplan-Editor) werden
erkannt, aber nicht mehr geöffnet; der Editor meldet das und startet mit einem
leeren Plan.

## Build, Tests & Deployment

```bash
cd web-app-submodules/flowberry
pnpm install
pnpm build          # -> dist/web (manifest.json + js/)
pnpm check:types
pnpm test           # Parser, Compiler, Simulation, Emitter
BERRY=/pfad/zu/berry pnpm test   # zusätzlich: Berry-Script im echten Interpreter
                                 # Zyklus für Zyklus gegen die Simulation
```

Browser-Test der Oberfläche (Chromium über playwright-core):

```bash
pnpm harness                       # Vite-Server auf Port 5302
node test/harness/run-harness.mjs
```

Deployment über das vorhandene Build-Script:

```bash
./web-app-submodules/build-web-extensions.sh flowberry
```

Ergebnis landet in `OC_APPS_DIR/flowberry/` und wird wie gewohnt in den
OpenCloud-Container gemountet.

## Warum Vue Flow

Version 0.1 nutzte bpmn-js. Für Ablaufpläne passt das schlecht: BPMN-Regeln
(z. B. keine Kanten zurück zum Start), kein Parallelogramm, BPMN-Optik ohne
Dunkelmodus, großes Bundle. Verglichen wurden außerdem:

- **Eclipse Sprotty** – stark für modellgetriebene Diagramme mit automatischem
  Layout (ELK), aber Werkzeugpalette und Bearbeiten bringt erst Eclipse GLSP
  mit, das einen Server-Prozess braucht; dazu InversifyJS mit Decorators und
  keine Vue-Anbindung.
- **maxGraph** (draw.io-Engine) – sehr mächtig, API aber noch 0.x und nicht Vue-nativ.
- **AntV X6**, **JointJS** – leistungsfähig, aber schwerer bzw. die
  Editor-Bausteine (Palette, Inspector) nur in der kommerziellen Variante.

Vue Flow ist Vue-3-nativ, MIT-lizenziert, klein (App-Bundle rund 270 kB statt
600 kB mit bpmn-js), Knoten sind normale Vue-Komponenten, und das Dateiformat ist
schlichtes JSON.
