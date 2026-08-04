# PDF Annotator für OpenCloud

Eine OpenCloud-Web-Extension, die PDFs mit [pdf.js](https://mozilla.github.io/pdf.js/)
anzeigt und die pdf.js-Anmerkungswerkzeuge (Markieren, Textnotiz, Freihand,
Stempel) direkt mit dem OpenCloud-Speicher verbindet.

Der eingebaute PDF-Viewer von OpenCloud bettet das PDF nur ein: Wer dort
Anmerkungen macht, kann das Ergebnis ausschließlich als Download speichern.
Diese App lädt das PDF stattdessen über den OpenCloud `AppWrapper`
(WebDAV, `responseType: arraybuffer`), erkennt Änderungen an den Anmerkungen
über den `annotationStorage` von pdf.js und schreibt das annotierte PDF über
`update:currentContent` und die normale Speichern-Funktion (inkl. Autosave,
Konfliktprüfung und Versionierung) zurück nach OpenCloud.

- Registriert sich für `.pdf`-Dateien (`hasPriority`, wird also Standard-App)
- Werkzeuge: Auswahl, Markieren, Textnotiz, Freihandzeichnung, Stempel/Bild
- Zoom, Seitenanzeige, Schreibschutz-Modus
- Verwendet den pdf.js-**Legacy-Build** (breite Browser-Unterstützung), der
  Worker ist inline gebündelt (kein Asset-Pfad-Problem unter Module Federation)

## Entwicklung

```sh
pnpm install
pnpm build          # Produktions-Build nach dist/web
pnpm run check      # Build + Typprüfung
```

## Smoke-Test der OpenCloud-Integration

`test/harness` stellt `src/App.vue` so bereit, wie der OpenCloud `AppWrapper`
die Komponente einbindet, und testet im echten Chromium: PDF rendern, per Maus
und Tastatur eine Textnotiz anlegen, prüfen, dass die App ein gültiges
annotiertes PDF über `update:currentContent` liefert und `save` auslöst.

```sh
pnpm exec vite --config vite.harness.config.ts   # Dev-Server auf Port 5299
node test/harness/run-harness.mjs                # Test mit Assertions
```

Der Runner erwartet ein Chromium unter `/opt/pw-browsers/chromium` oder in
`HARNESS_CHROMIUM`.
