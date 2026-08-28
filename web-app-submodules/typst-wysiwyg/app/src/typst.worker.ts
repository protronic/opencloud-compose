// Web Worker that owns the Typst WASM compiler so compiles run off the main
// thread and never jank typing or scrolling. The main thread talks to it via
// the typed request/response messages below (see typst.ts).

import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';
import { loadFonts } from '@myriaddreamin/typst.ts';
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
// OpenCloud vendor patch: the OpenCloud instance CSP has no CDN hosts, so the
// typst.ts default font assets (jsdelivr) can never load. Bundle the DejaVu
// family instead and disable the remote assets - same setup as the
// typst-editor extension, so both apps render with identical fonts.
import fontSans from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import fontSansBold from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';
import fontSansOblique from 'dejavu-fonts-ttf/ttf/DejaVuSans-Oblique.ttf?url';
import fontSansBoldOblique from 'dejavu-fonts-ttf/ttf/DejaVuSans-BoldOblique.ttf?url';
import fontSerif from 'dejavu-fonts-ttf/ttf/DejaVuSerif.ttf?url';
import fontSerifBold from 'dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf?url';
import fontSerifItalic from 'dejavu-fonts-ttf/ttf/DejaVuSerif-Italic.ttf?url';
import fontSerifBoldItalic from 'dejavu-fonts-ttf/ttf/DejaVuSerif-BoldItalic.ttf?url';
import fontMono from 'dejavu-fonts-ttf/ttf/DejaVuSansMono.ttf?url';
import fontMonoBold from 'dejavu-fonts-ttf/ttf/DejaVuSansMono-Bold.ttf?url';
import fontMath from 'dejavu-fonts-ttf/ttf/DejaVuMathTeXGyre.ttf?url';

export type TypstRequest = {
  id: number;
  kind: 'svg' | 'pdf' | 'fragment';
  source: string;
  assets: [string, Uint8Array][];
};
export type TypstResponse =
  | { id: number; ok: true; svg: string }
  | { id: number; ok: true; pdf: Uint8Array }
  | { id: number; ok: false; error: string };

let initialized = false;
function init(): void {
  if (initialized) return;
  // assets: false keeps loadFonts from appending the remote default font
  // assets, which the OpenCloud CSP would block anyway.
  $typst.use(TypstSnippet.disableDefaultFontAssets(), {
    key: 'access-model',
    forRoles: ['compiler'],
    provides: [
      loadFonts(
        [
          fontSans,
          fontSansBold,
          fontSansOblique,
          fontSansBoldOblique,
          fontSerif,
          fontSerifBold,
          fontSerifItalic,
          fontSerifBoldItalic,
          fontMono,
          fontMonoBold,
          fontMath,
        ],
        { assets: false },
      ),
    ],
  });
  $typst.setCompilerInitOptions({ getModule: () => compilerWasm });
  $typst.setRendererInitOptions({ getModule: () => rendererWasm });
  initialized = true;
}

// Bundled-font defaults, prepended to every compile (never part of the saved
// document): DejaVu for text/raw and the DejaVu math font for equations -
// explicit #set/#show rules in the document still win.
const FONT_PREAMBLE = [
  '#set text(font: ("DejaVu Serif", "DejaVu Sans"))',
  '#show math.equation: set text(font: "DejaVu Math TeX Gyre")',
  '#show raw: set text(font: "DejaVu Sans Mono")',
].join('\n') + '\n';

// One WASM instance, so serialize every compile to avoid interleaving them.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function handle(req: TypstRequest): Promise<TypstResponse> {
  return enqueue(async () => {
    try {
      init();
      for (const [path, bytes] of req.assets) await $typst.mapShadow(path, bytes);
      const source = FONT_PREAMBLE + req.source;
      if (req.kind === 'pdf') {
        const pdf = await $typst.pdf({ mainContent: source });
        if (!pdf) throw new Error('PDF generation returned no data');
        return { id: req.id, ok: true, pdf } as TypstResponse;
      }
      const svg = await $typst.svg({ mainContent: source });
      return { id: req.id, ok: true, svg } as TypstResponse;
    } catch (e) {
      return { id: req.id, ok: false, error: String(e) } as TypstResponse;
    }
  });
}

self.onmessage = async (ev: MessageEvent<TypstRequest>) => {
  const res = await handle(ev.data);
  // Transfer the PDF bytes back to avoid a copy.
  if ('pdf' in res) (self as unknown as Worker).postMessage(res, [res.pdf.buffer]);
  else (self as unknown as Worker).postMessage(res);
};
