# Typst Editor für OpenCloud

Eine OpenCloud-Web-Extension, die [Typst](https://typst.app/docs)-Dokumente
(`.typ`) direkt im Browser bearbeitet: CodeMirror-Editor links, live
kompilierte Vorschau rechts. Die Kompilierung läuft vollständig im Browser
über den [typst.ts](https://github.com/Myriad-Dreamin/typst.ts)-WASM-Compiler
— es wird kein Server und kein CDN benötigt.

- Registriert sich für `.typ`-Dateien (Standard-App, inkl. „Neu"-Menü)
- Live-Vorschau mit Fehleranzeige (Diagnosen des Typst-Compilers)
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
(inkl. Mathematik), editiert den Quelltext, verifiziert den
AppWrapper-Kontrakt (`update:currentContent` + `save`) und testet, dass
Kompilierfehler angezeigt und wieder aufgeräumt werden.
