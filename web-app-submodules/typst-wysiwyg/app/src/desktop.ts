// OpenCloud vendor patch: the upstream desktop.ts integrates Tauri via
// dynamic imports of @tauri-apps/*. Inside OpenCloud the app only ever runs
// in the browser, so this stub avoids carrying the Tauri packages while
// keeping the upstream call sites unchanged (isDesktop() is always false,
// the dialog helpers are never reached).

export interface FileFilter {
  name: string;
  extensions: string[];
}

/** True when running inside the Tauri webview - never inside OpenCloud. */
export function isDesktop(): boolean {
  return false;
}

export async function saveTextDialog(
  _defaultName: string,
  _filters: FileFilter[],
  _contents: string,
): Promise<boolean> {
  throw new Error('Desktop integration is not available in the OpenCloud build');
}

export async function saveBytesDialog(
  _defaultName: string,
  _filters: FileFilter[],
  _bytes: Uint8Array,
): Promise<boolean> {
  throw new Error('Desktop integration is not available in the OpenCloud build');
}

export async function openTextDialog(_filters: FileFilter[]): Promise<string | null> {
  throw new Error('Desktop integration is not available in the OpenCloud build');
}
