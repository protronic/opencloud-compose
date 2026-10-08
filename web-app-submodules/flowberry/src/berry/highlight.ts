/** Minimale Syntaxhervorhebung für das generierte Berry (eine Zeile → HTML). */

const TOKEN =
  /(#.*$)|("(?:[^"\\]|\\.)*")|\b(class|def|end|if|elif|else|while|for|return|var|import|true|false|nil|self)\b|\b(\d+)\b/g;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightBerryLine(line: string): string {
  let html = '';
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    html += escapeHtml(line.slice(last, index));
    const cls = match[1] ? 'c' : match[2] ? 's' : match[3] ? 'k' : 'n';
    html += `<span class="tok-${cls}">${escapeHtml(match[0])}</span>`;
    last = index + match[0].length;
  }
  return html + escapeHtml(line.slice(last));
}

/** Farben der Tokens – Mitteltöne, lesbar auf hellem und dunklem Hintergrund. */
export const HIGHLIGHT_CSS = `
.tok-c { color: #7a8794; font-style: italic; }
.tok-s { color: #2e9e5b; }
.tok-k { color: #9a5cf0; font-weight: 600; }
.tok-n { color: #d0781f; }
`;
