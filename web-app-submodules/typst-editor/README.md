# Typst Editor für OpenCloud

Eine OpenCloud-Web-Extension, die [Typst](https://typst.app/docs)-Dokumente
(`.typ`) direkt im Browser bearbeitet: CodeMirror-Editor links, live
kompilierte Vorschau rechts. Die Kompilierung läuft vollständig im Browser
über den [typst.ts](https://github.com/Myriad-Dreamin/typst.ts)-WASM-Compiler
— es wird kein Server und kein CDN benötigt.

- Registriert sich für `.typ`-Dateien (Standard-App, inkl. „Neu"-Menü)
- Live-Vorschau mit Fehleranzeige: Datei, Zeile und Spalte; Fehler im offenen
  Dokument werden direkt im Quelltext markiert (Diagnosen des Typst-Compilers)
- Typst-Syntaxhervorhebung, Vervollständigung für Typst-Funktionen und
  -Symbole, Einklappen von Abschnitten, Listen werden mit Enter fortgesetzt
  ([codemirror-lang-typst](https://github.com/kxxt/codemirror-lang-typst),
  reiner Lezer-Parser ohne WASM)
- Weitere Dateien aus OpenCloud: `#import`/`#include`, Bilder und Daten
  (`csv`, `json`, `yaml`, …) relativ zum Dokument (`kapitel.typ`,
  `../Vorlagen/kopf.typ`) oder absolut im Space (`/Vorlagen/kopf.typ`).
  Geladen werden nur Dateien, die das Dokument tatsächlich verwendet – der
  Compiler meldet jeden benötigten Pfad (`src/projectFiles.ts`), der Editor
  holt ihn per WebDAV und kompiliert erneut. Beim Zurückwechseln ins Fenster
  werden geänderte und neu angelegte Dateien übernommen.
- Typst-Pakete (`#import "@preview/…"`) werden noch nicht geladen (bräuchte
  `https://packages.typst.org` in der CSP)
- Autosave über den OpenCloud `AppWrapper` (debounced) plus expliziter
  Speichern-Button
- Bündelt die DejaVu-Schriften; ein unsichtbarer Wrapper mappt die
  Typst-Standardfonts (Text, Code, Mathematik) darauf, sodass auch
  Formeln ohne weitere Konfiguration funktionieren
- Über-Dialog mit Git-Commit des Builds (`TYPST_GIT_COMMIT` beim
  Docker-Build, siehe build-web-extensions.sh)

## Entwicklung

```sh
pnpm install
pnpm build          # Produktions-Build nach dist/web
pnpm run check      # Build + Typprüfung
```

## Smoke-Test

```sh
pnpm exec vite --config vite.harness.config.ts   # Port 5301
node test/harness/run-harness.mjs
```

Der Harness rendert das Beispieldokument, prüft die kompilierte Vorschau
(inkl. Mathematik, importierter Datei und Bild aus dem nachgebildeten Space –
und dass nur diese Dateien gelesen werden), die Syntaxhervorhebung, editiert
den Quelltext, verifiziert den AppWrapper-Kontrakt (`update:currentContent` +
`save`) und testet, dass Kompilierfehler und fehlende Dateien angezeigt,
im Quelltext markiert und wieder aufgeräumt werden.
