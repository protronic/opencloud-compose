/**
 * Minimal comment manager for the pdf.js annotation editors.
 *
 * pdfjs-dist ships the editor-side comment machinery (toolbar button,
 * standalone bubble button, serialization into the PDF as popup contents),
 * but the dialog/popup UI lives in the full viewer and is not part of the
 * npm package. This class implements the interface the editors call on
 * `PDFViewer`'s `commentManager` option, derived from the pdf.js call
 * sites: showDialog, toggleCommentPopup, updateComment, updatePopupColor,
 * removeComments, makeCommentColor, hideSidebar, showSidebar, destroyPopup,
 * getCommentDialogElement and destroy.
 */

type CommentValue = string | null | {text?: string | null};

/** Editor or annotation-layer element that owns a comment. */
type CommentOwner = {
  comment: CommentValue;
  div?: HTMLElement | null;
  elementBeforePopup?: HTMLElement | null;
};

type CommentManagerOptions = {
  /** Positioned host element the dialog/popup are appended to. */
  container: HTMLElement;
  /** Called after a comment was added, changed or deleted via the dialog. */
  onChanged: () => void;
};

function commentText(value: CommentValue): string {
  if (typeof value === 'string') return value;
  return value?.text ?? '';
}

export class PdfCommentManager {
  #container: HTMLElement;
  #onChanged: () => void;
  #dialog: HTMLElement | null = null;
  #backdrop: HTMLElement | null = null;
  #textarea: HTMLTextAreaElement | null = null;
  #deleteButton: HTMLButtonElement | null = null;
  #popup: HTMLElement | null = null;
  #currentEditor: CommentOwner | null = null;

  constructor({container, onChanged}: CommentManagerOptions) {
    this.#container = container;
    this.#onChanged = onChanged;
  }

  /** Opens the edit dialog for an editor's comment. */
  showDialog(
    _uiManager: unknown,
    editor: CommentOwner,
    posX?: number,
    posY?: number,
    _options?: unknown,
  ): void {
    this.destroyPopup();
    this.#currentEditor = editor;
    const dialog = this.#ensureDialog();
    this.#backdrop!.classList.remove('hidden');

    const existing = commentText(editor.comment);
    this.#textarea!.value = existing;
    this.#deleteButton!.classList.toggle('hidden', !existing);

    // Position near the annotation when client coordinates are provided.
    const host = this.#container.getBoundingClientRect();
    dialog.style.visibility = 'hidden';
    dialog.style.left = '0px';
    dialog.style.top = '0px';
    requestAnimationFrame(() => {
      const dialogRect = dialog.getBoundingClientRect();
      let left = (host.width - dialogRect.width) / 2;
      let top = (host.height - dialogRect.height) / 3;
      if (typeof posX === 'number' && typeof posY === 'number' && Number.isFinite(posX)) {
        left = posX - host.left;
        top = posY - host.top + 8;
      }
      left = Math.min(Math.max(left, 8), Math.max(8, host.width - dialogRect.width - 8));
      top = Math.min(Math.max(top, 8), Math.max(8, host.height - dialogRect.height - 8));
      dialog.style.left = `${Math.round(left)}px`;
      dialog.style.top = `${Math.round(top)}px`;
      dialog.style.visibility = '';
      this.#textarea!.focus();
      this.#textarea!.setSelectionRange(existing.length, existing.length);
    });
  }

  /** Shows or hides the read-only comment bubble for an owner. */
  toggleCommentPopup(
    owner: CommentOwner | null,
    isSelected?: boolean,
    visibility?: boolean,
    _hasNoOwnButton?: boolean,
  ): void {
    if (!owner) {
      this.destroyPopup();
      return;
    }
    const text = commentText(owner.comment);
    const show = !!text && (visibility ?? !!isSelected);
    if (!show) {
      this.destroyPopup();
      return;
    }

    const popup = this.#ensurePopup();
    popup.textContent = text;
    popup.classList.remove('hidden');

    const host = this.#container.getBoundingClientRect();
    const anchor =
      owner.elementBeforePopup?.getBoundingClientRect() ?? owner.div?.getBoundingClientRect();
    requestAnimationFrame(() => {
      const popupRect = popup.getBoundingClientRect();
      let left = (host.width - popupRect.width) / 2;
      let top = 16;
      if (anchor) {
        left = anchor.right - host.left + 8;
        top = anchor.top - host.top;
        if (left + popupRect.width > host.width - 8) {
          left = anchor.left - host.left - popupRect.width - 8;
        }
      }
      left = Math.min(Math.max(left, 8), Math.max(8, host.width - popupRect.width - 8));
      top = Math.min(Math.max(top, 8), Math.max(8, host.height - popupRect.height - 8));
      popup.style.left = `${Math.round(left)}px`;
      popup.style.top = `${Math.round(top)}px`;
    });
  }

  /** Background color for standalone comment buttons (pdf.js contract). */
  makeCommentColor(color: string | null | undefined, opacity: number | null | undefined): string {
    if (!color) return '';
    const percent = Math.round((opacity ?? 1) * 100);
    return `color-mix(in srgb, ${color} ${percent}%, white)`;
  }

  /** Called by the AnnotationEditorUIManager constructor. */
  setSidebarUiManager(_uiManager: unknown): void {}

  updateComment(_data: unknown): void {
    // Sidebar/popup bookkeeping in pdf.js; the bubble is re-rendered on toggle.
  }

  updatePopupColor(_editor: unknown): void {}

  removeComments(_uids: unknown): void {
    this.destroyPopup();
  }

  hideSidebar(): void {}

  showSidebar(_allComments: unknown): void {}

  /** Read by the UI manager for aria wiring of comment buttons. */
  get dialogElement(): HTMLElement {
    return this.#ensureDialog();
  }

  getCommentDialogElement(): HTMLElement {
    return this.#ensureDialog();
  }

  destroyPopup(): void {
    this.#popup?.classList.add('hidden');
  }

  destroy(): void {
    this.#backdrop?.remove();
    this.#popup?.remove();
    this.#backdrop = null;
    this.#dialog = null;
    this.#textarea = null;
    this.#deleteButton = null;
    this.#popup = null;
    this.#currentEditor = null;
  }

  #closeDialog(): void {
    this.#backdrop?.classList.add('hidden');
    this.#currentEditor = null;
  }

  #saveDialog(): void {
    const editor = this.#currentEditor;
    if (!editor) return;
    const text = this.#textarea!.value.trim();
    // The editor setter accepts a plain string; null marks the comment as
    // deleted. It updates the toolbar/standalone buttons itself.
    editor.comment = text ? text : null;
    this.#closeDialog();
    this.#onChanged();
  }

  #deleteDialog(): void {
    const editor = this.#currentEditor;
    if (!editor) return;
    editor.comment = null;
    this.#closeDialog();
    this.#onChanged();
  }

  #ensurePopup(): HTMLElement {
    if (this.#popup) return this.#popup;
    const popup = document.createElement('div');
    popup.id = 'commentPopup';
    popup.className = 'pdfa-comment-popup hidden';
    popup.setAttribute('role', 'note');
    this.#container.append(popup);
    this.#popup = popup;
    return popup;
  }

  #ensureDialog(): HTMLElement {
    if (this.#dialog) return this.#dialog;

    const backdrop = document.createElement('div');
    backdrop.className = 'pdfa-comment-backdrop hidden';
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) this.#closeDialog();
    });

    const dialog = document.createElement('div');
    dialog.className = 'pdfa-comment-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Kommentar');

    const textarea = document.createElement('textarea');
    textarea.className = 'pdfa-comment-text';
    textarea.placeholder = 'Kommentar hinzufügen …';
    textarea.rows = 4;
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.#closeDialog();
      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        this.#saveDialog();
      }
    });

    const row = document.createElement('div');
    row.className = 'pdfa-comment-actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'pdfa-comment-delete';
    deleteButton.textContent = 'Löschen';
    deleteButton.addEventListener('click', () => this.#deleteDialog());

    const spacer = document.createElement('span');
    spacer.className = 'pdfa-comment-spacer';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'pdfa-comment-cancel';
    cancelButton.textContent = 'Abbrechen';
    cancelButton.addEventListener('click', () => this.#closeDialog());

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'pdfa-comment-save';
    saveButton.textContent = 'Speichern';
    saveButton.addEventListener('click', () => this.#saveDialog());

    row.append(deleteButton, spacer, cancelButton, saveButton);
    dialog.append(textarea, row);
    backdrop.append(dialog);
    this.#container.append(backdrop);

    this.#backdrop = backdrop;
    this.#dialog = dialog;
    this.#textarea = textarea;
    this.#deleteButton = deleteButton;
    return dialog;
  }
}
