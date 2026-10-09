# TeXlyre für OpenCloud (Versuch)

Bindet [TeXlyre](https://github.com/TeXlyre/texlyre) – einen lokal laufenden
LaTeX-/Typst-Editor mit Projektbaum, Vorschau, Formatierer, Gliederung und
Sprung zwischen Quelltext und Vorschau – als zusätzliche „Öffnen mit“-App für
`.typ`-Dateien in OpenCloud ein. Der typst-editor bleibt Standard.

## So funktioniert es

- **Ordner = Projekt:** „Mit TeXlyre öffnen“ auf einer `.typ`-Datei öffnet
  den *ganzen Ordner* der Datei als TeXlyre-Projekt (Unterordner, Includes,
  Bilder) und zeigt die angeklickte Datei an.
- **Kein Anmeldedialog:** TeXlyre legt im Browser automatisch ein lokales
  Konto für den OpenCloud-Nutzer an; das Projekt eines Ordners wird beim
  nächsten Öffnen wiederverwendet.
- **Speichern:** TeXlyres Arbeitsordner-Modus ist mit dem OpenCloud-Ordner
  verbunden – Änderungen gehen nach ca. 1 s per WebDAV in die Dateien,
  Änderungen von anderen Clients holt TeXlyre beim Zurückwechseln bzw. alle
  10 s. Die Dateien in OpenCloud bleiben die Wahrheit; TeXlyres Browser-Speicher
  ist nur Zwischenablage.
- **Technik:** `src/` ist der OpenCloud-Wrapper (Module Federation). Er lädt
  TeXlyre aus `/assets/apps/texlyre/app/` in ein Same-Origin-iframe und stellt
  ihm unter `window.__texlyreOpenCloud` eine kleine Datei-Brücke auf den
  Ordner bereit (`src/ocBridge.ts`, WebDAV über den OpenCloud-Client).
  TeXlyre selbst wird beim Build aus einem festen Upstream-Commit gebaut und
  minimal gepatcht – siehe `upstream/UPSTREAM.md`.

## Grenzen des Versuchs

- **Nur Typst.** Die LaTeX-Engines (~690 MB), der LaTeX-Formatierer sowie der
  draw.io- und TikZ-Editor werden nicht ausgeliefert. Für LaTeX bräuchte es
  zusätzlich die TeX-Live-Dienste von TeXlyre (bzw. eigene) in der CSP.
- **Keine Zusammenarbeit (noch):** Im OpenCloud-Modus baut TeXlyre keine
  Verbindungen zu seinen Diensten auf (WebRTC-Signaling auf texlyre.org,
  FilePizza/PeerJS). Der WebRTC-Weg aus
  [texlyre-infrastructure](https://github.com/TeXlyre/texlyre-infrastructure)
  wurde getestet und verworfen: ohne zentralen Dokumentstand legen zwei
  Nutzer denselben Dateiinhalt unabhängig an, und mit TeXlyres lokalem
  Zwischenspeicher droht doppelter Text in den OpenCloud-Dateien. Der
  passende Weg ist OpenCloud's eigener yjs-Server (`yjs/yjs.yml`, Hocuspocus,
  Anmeldung über OpenCloud, ein Live-Raum pro Datei) - dafür braucht TeXlyre
  einen Hocuspocus-Provider für seine Dokumente.
- **Typst-Pakete** (`#import "@preview/…"`) brauchen `https://packages.typst.org`
  in `connect-src` der CSP.
- **Größe:** ~170 MB (Compiler, Schriften, Symbolerkennung) – geladen wird nur,
  was der Browser braucht, das Deployment kopiert aber alles.
- **Gleichzeitiges Bearbeiten:** Änderungen von anderen Clients an Dateien,
  die in TeXlyre *nicht* offen sind, kommen an. Einen bereits offenen Tab
  aktualisiert TeXlyre nicht – beim nächsten Speichern überschreibt er die
  fremde Änderung (der vorige Stand bleibt in der OpenCloud-Versionshistorie).
  Die Vorschau kompiliert nach externen Änderungen erst beim nächsten
  Kompilieren (F9) neu.

## Ausprobieren im Demo-Env

`.env.demo-server.example` baut `typst-editor` und `texlyre` mit:

```bash
cp .env.demo-server.example .env
# Zertifikat für test.oc und *.test.oc nach certs/ und config/traefik/dynamic/certs.yml
# (Beispiel in der .env), z. B.:
#   mkcert -cert-file certs/test.oc.crt -key-file certs/test.oc.key test.oc "*.test.oc"
# test.oc auf 127.0.0.1 zeigen lassen (/etc/hosts)
./web-app-submodules/build-web-extensions.sh   # baut OC_WEB_APPS (TeXlyre: einige Minuten)
docker compose up -d
```

Dann `https://test.oc:9200`, Anmeldung z. B. als `alan` / `demo`, einen Ordner mit
`.typ`-Dateien anlegen und auf einer `.typ`-Datei „Öffnen mit…“ → „Mit TeXlyre öffnen“.
Nach einem neuen Build OpenCloud neu starten (`docker compose restart opencloud`).

## Build

```bash
pnpm install
pnpm build          # Wrapper -> dist/web, TeXlyre -> dist/web/app (braucht node >= 24.13.1,
                    # npm, tar, git; lädt TeXlyre + Assets von GitHub)
pnpm check:types
```

Der TeXlyre-Teil wird in `.texlyre-build/<commit>/` zwischengespeichert;
ein erneuter Build überspringt Download und `npm ci`.

Über das Build-Script der Compose-Umgebung:

```bash
./web-app-submodules/build-web-extensions.sh texlyre
```

## Test

```bash
pnpm build
pnpm harness                       # Vite auf Port 5303, liefert TeXlyre mit der OpenCloud-CSP
node test/harness/run-harness.mjs
```

Der Harness bindet `src/App.vue` wie der OpenCloud-AppWrapper ein (WebDAV im
Speicher nachgebildet, TeXlyre ausgeliefert wie von OpenCloud: mit dessen CSP
und `<base href="/">`) und prüft: Projekt aus dem Ordner ohne Dialoge,
Kompilieren der Vorschau, Zurückschreiben beim Tippen, Übernahme einer
Änderung von außen, kein Zugriff außerhalb des Ordners, keine CSP-Blockaden,
keine Verbindungen zu TeXlyre-Diensten, iframe-Adresse bleibt in der App.

## Lizenz

TeXlyre steht unter AGPL-3.0-or-later; der Quelltext samt Patches liegt in
diesem Repository bzw. upstream, `dist/web/app/TEXLYRE-UPSTREAM.txt` verweist
darauf.
