/**
 * Files of the OpenCloud space next to the open document: the Typst compiler
 * asks for every file it needs (#import, #include, images, data files)
 * through the access model below. Unknown paths are recorded and answered
 * with "not there"; the editor then loads them from OpenCloud, maps them into
 * the compiler as shadow files and compiles again. Only files the document
 * actually uses are loaded - no folder listing, no project setup.
 *
 * The compiler root is the space root and the document sits at its real space
 * path, so relative (`bilder/logo.png`, `../vorlage.typ`) and space-absolute
 * (`/Vorlagen/brief.typ`) paths work as in a local Typst project.
 */

/** Path of the wrapper that sets the bundled fonts and includes the document. */
export const WRAPPER_PATH = '/__typst-editor__/main.typ';

/** Files larger than this are not loaded into the browser. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Subset of typst.ts' WritableAccessModel (not exported as a type). */
export class RequestRecorder {
  readonly requested = new Set<string>();

  getMTime(path: string): Date | undefined {
    this.requested.add(path);
    return undefined;
  }

  isFile(): boolean {
    return true;
  }

  getRealPath(path: string): string {
    return path;
  }

  readAll(path: string): Uint8Array | undefined {
    this.requested.add(path);
    return undefined;
  }

  insertFile(): void {}

  removeFile(): void {}
}

type ReadFile = (path: string) => Promise<ArrayBuffer>;
type MapShadow = (path: string, content: Uint8Array) => Promise<void>;
type UnmapShadow = (path: string) => Promise<void>;

/** Loaded and missing files of one space; reset when the document changes. */
export class ProjectFiles {
  private readonly loaded = new Map<string, Uint8Array>();
  private readonly missing = new Set<string>();

  constructor(
    private readonly recorder: RequestRecorder,
    private readonly mapShadow: MapShadow,
    private readonly unmapShadow: UnmapShadow,
  ) {}

  /** Paths loaded from OpenCloud (for tests and the status line). */
  get loadedPaths(): string[] {
    return [...this.loaded.keys()];
  }

  isMissing(path: string): boolean {
    return this.missing.has(path);
  }

  /**
   * Loads the files the last compile asked for. Returns true when at least
   * one new file arrived (worth compiling again).
   */
  async loadRequested(readFile: ReadFile | undefined, skip: Set<string>): Promise<boolean> {
    const paths = [...this.recorder.requested].filter(
      (path) => isSpacePath(path) && !skip.has(path) && !this.loaded.has(path) && !this.missing.has(path),
    );
    this.recorder.requested.clear();
    if (!paths.length || !readFile) return false;
    const results = await Promise.all(
      paths.map(async (path) => {
        try {
          const buffer = await readFile(path);
          if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('too large');
          const data = new Uint8Array(buffer);
          await this.mapShadow(path, data);
          this.loaded.set(path, data);
          return true;
        } catch {
          this.missing.add(path);
          return false;
        }
      }),
    );
    return results.some(Boolean);
  }

  /**
   * Re-reads the loaded files (changed elsewhere in OpenCloud) and retries
   * the missing ones (maybe created meanwhile) - the compiler does not ask
   * again for a path it could not read. Returns true when the next compile
   * can differ.
   */
  async refresh(readFile: ReadFile | undefined): Promise<boolean> {
    if (!readFile) return false;
    let changed = false;
    const retry = [...this.missing];
    this.missing.clear();
    await Promise.all(
      retry.map(async (path) => {
        try {
          const buffer = await readFile(path);
          if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('too large');
          const data = new Uint8Array(buffer);
          await this.mapShadow(path, data);
          this.loaded.set(path, data);
          changed = true;
        } catch {
          this.missing.add(path);
        }
      }),
    );
    await Promise.all(
      [...this.loaded].filter(([path]) => !retry.includes(path)).map(async ([path, previous]) => {
        try {
          const data = new Uint8Array(await readFile(path));
          if (sameBytes(previous, data)) return;
          await this.mapShadow(path, data);
          this.loaded.set(path, data);
        } catch {
          await this.unmapShadow(path);
          this.loaded.delete(path);
        }
        changed = true;
      }),
    );
    return changed;
  }

  async clear(): Promise<void> {
    await Promise.all([...this.loaded.keys()].map((path) => this.unmapShadow(path)));
    this.loaded.clear();
    this.missing.clear();
    this.recorder.requested.clear();
  }
}

/** Package files and the editor's own wrapper never come from OpenCloud. */
function isSpacePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('/@') && !path.startsWith('/__typst-editor__/');
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Space path of the open document; a fallback for documents without one. */
export function documentPath(resourcePath: string | undefined): string {
  const path = (resourcePath ?? '').trim();
  if (!path) return '/dokument.typ';
  return path.startsWith('/') ? path : `/${path}`;
}

export function wrapperSource(docPath: string): string {
  const quoted = docPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    [
      '#set text(font: ("DejaVu Serif", "DejaVu Sans"))',
      '#show math.equation: set text(font: "DejaVu Math TeX Gyre")',
      '#show raw: set text(font: "DejaVu Sans Mono")',
      `#include "${quoted}"`,
    ].join('\n') + '\n'
  );
}

/** A compiler diagnostic (typst.ts `diagnostics: 'full'`). */
export type CompilerDiagnostic = {
  package?: string;
  path?: string;
  severity?: string;
  range?: string;
  message?: string;
};

export type DiagnosticPosition = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};

/** Parses "line:column-line:column" (zero-based) of a diagnostic. */
export function parseRange(range: string | undefined): DiagnosticPosition | undefined {
  const match = /^(\d+):(\d+)-(\d+):(\d+)$/.exec(range?.trim() ?? '');
  if (!match) return undefined;
  const [startLine, startColumn, endLine, endColumn] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  return {startLine, startColumn, endLine, endColumn};
}

/** The diagnostic's file as space path ("" for package files). */
export function diagnosticPath(diagnostic: CompilerDiagnostic): string {
  if (diagnostic.package) return '';
  const path = diagnostic.path ?? '';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Path relative to the document's folder, for messages. */
export function relativeTo(docPath: string, path: string): string {
  const dir = docPath.replace(/[^/]*$/, '');
  return path.startsWith(dir) ? path.slice(dir.length) : path;
}
