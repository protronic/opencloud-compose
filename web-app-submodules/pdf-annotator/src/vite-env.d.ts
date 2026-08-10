/// <reference types="vite/client" />

declare module '*.svg?url' {
  const src: string;
  export default src;
}

// Injected at build time, see build-info.ts.
declare const __PDFA_VERSION__: string;
declare const __PDFA_COMMIT__: string;
declare const __PDFA_BUILD_TIME__: string;
