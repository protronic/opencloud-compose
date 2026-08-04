import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createApp, defineComponent, h, ref} from 'vue';
import type {Resource} from '@opencloud-eu/web-client';
import App from '../../src/App.vue';

type HarnessState = {
  emitted: Array<{length: number; head: number[]}>;
  saves: number;
  errors: string[];
};

declare global {
  interface Window {
    __harness: HarnessState;
    __verifyEmitted: () => Promise<{numPages: number; annotationSubtypes: string[]}>;
  }
}

window.__harness = {
  emitted: [],
  saves: 0,
  errors: [],
};

window.addEventListener('error', (event) => {
  window.__harness.errors.push(String(event.error ?? event.message));
});
window.addEventListener('unhandledrejection', (event) => {
  window.__harness.errors.push(String(event.reason));
});

// Minimal but valid two-page PDF with correct xref offsets.
function makeSamplePdf(): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  const offsets: number[] = [];
  let position = 0;

  const push = (text: string): void => {
    chunks.push(text);
    position += encoder.encode(text).length;
  };
  const pushObject = (body: string): void => {
    offsets.push(position);
    push(body);
  };

  push('%PDF-1.4\n');
  pushObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  pushObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n');
  pushObject(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
  );
  pushObject(
    '4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>\nendobj\n',
  );
  pushObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  const streamOne = 'BT /F1 24 Tf 72 770 Td (Testseite 1) Tj ET';
  pushObject(
    `6 0 obj\n<< /Length ${streamOne.length} >>\nstream\n${streamOne}\nendstream\nendobj\n`,
  );
  const streamTwo = 'BT /F1 24 Tf 72 770 Td (Testseite 2) Tj ET';
  pushObject(
    `7 0 obj\n<< /Length ${streamTwo.length} >>\nstream\n${streamTwo}\nendstream\nendobj\n`,
  );

  const xrefPosition = position;
  const pad = (value: number): string => String(value).padStart(10, '0');
  push(
    `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n` +
      offsets.map((offset) => `${pad(offset)} 00000 n \n`).join(''),
  );
  push(
    `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`,
  );

  return encoder.encode(chunks.join(''));
}

const samplePdf = makeSamplePdf();
let lastEmitted: ArrayBuffer | undefined;

window.__verifyEmitted = async () => {
  if (!lastEmitted) throw new Error('no emitted content to verify');
  // Parse a copy: getDocument transfers the buffer to the worker.
  const doc = await getDocument({data: new Uint8Array(lastEmitted).slice()}).promise;
  const page = await doc.getPage(1);
  const annotations = await page.getAnnotations();
  const result = {
    numPages: doc.numPages,
    annotationSubtypes: annotations.map((entry: {subtype?: string}) => entry.subtype ?? '?'),
  };
  await doc.destroy();
  return result;
};

// Mimics @opencloud-eu/web-pkg AppWrapper: content is fetched (arraybuffer)
// before the wrapped component mounts; update:currentContent flows back into
// the prop; save events would trigger the WebDAV PUT.
const Host = defineComponent({
  setup() {
    const currentContent = ref<ArrayBuffer | Uint8Array>(samplePdf.buffer as ArrayBuffer);
    const resource = {
      id: 'res-pdf-1',
      name: 'vertrag.pdf',
      path: '/vertrag.pdf',
      size: samplePdf.length,
      extension: 'pdf',
      mimeType: 'application/pdf',
    } as unknown as Resource;

    return () =>
      h(App, {
        currentContent: currentContent.value,
        isReadOnly: false,
        resource,
        'onUpdate:currentContent': (value: ArrayBuffer) => {
          // The real transport (axios) sends `view.buffer` for typed-array
          // bodies, which corrupts the file when the view is narrower than
          // its buffer. The app must therefore emit an exact ArrayBuffer.
          if (!(value instanceof ArrayBuffer)) {
            window.__harness.errors.push(
              `emitted content must be an ArrayBuffer, got ${Object.prototype.toString.call(value)}`,
            );
          }
          lastEmitted = value;
          const bytes = new Uint8Array(value);
          window.__harness.emitted.push({
            length: bytes.length,
            head: Array.from(bytes.slice(0, 5)),
          });
          currentContent.value = value;
        },
      });
  },
});

createApp(Host).mount('#host');
