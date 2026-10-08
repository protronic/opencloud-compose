<template>
  <section class="fb-codepanel">
    <div class="fb-codepanel__bar">
      <span class="fb-codepanel__name">{{ beName }}</span>
      <button :title="$gettext('In die Zwischenablage kopieren')" @click="copy">
        {{ copied ? $gettext('Kopiert') : $gettext('Kopieren') }}
      </button>
      <button :title="$gettext('Code in eigenem Fenster anzeigen, z. B. auf dem zweiten Bildschirm')" @click="popOut">
        {{ $gettext('Fenster') }} ↗
      </button>
      <button
        v-if="canExport"
        class="fb-codepanel__primary"
        :title="$gettext('Berry-Script neben der .flowberry-Datei speichern')"
        @click="emit('export')"
      >
        {{ $gettext('Speichern als .be') }}
      </button>
    </div>
    <div ref="scroller" class="fb-codepanel__code">
      <pre><code><span
        v-for="(line, index) in htmlLines"
        :key="index"
        class="fb-codepanel__line"
        :class="{'fb-codepanel__line--hl': isHighlighted(index)}"
        :data-line="index + 1"
        v-html="line"
      /></code></pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch} from 'vue';
import {useGettext} from 'vue3-gettext';
import {HIGHLIGHT_CSS, highlightBerryLine} from '../berry/highlight.ts';

const props = defineProps<{
  code: string;
  lineRanges: Record<string, [number, number]>;
  selectedNodeId: string | null;
  beName: string;
  canExport: boolean;
}>();

const emit = defineEmits<{export: []}>();
const {$gettext} = useGettext();

const scroller = useTemplateRef<HTMLElement>('scroller');
const copied = ref(false);
let popup: Window | null = null;

const htmlLines = computed(() => props.code.replace(/\n$/, '').split('\n').map(highlightBerryLine));
const range = computed(() => (props.selectedNodeId ? props.lineRanges[props.selectedNodeId] : undefined));

function isHighlighted(index: number) {
  return !!range.value && index >= range.value[0] && index <= range.value[1];
}

watch(range, async (value) => {
  if (!value) {
    return;
  }
  await nextTick();
  scroller.value
    ?.querySelector(`[data-line="${value[0] + 1}"]`)
    ?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
});

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch (err) {
    console.error('flowberry: clipboard write failed', err);
  }
}

const POPUP_CSS = `
:root { color-scheme: light dark; }
body { margin: 0; font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: #fbfbfa; color: #1d232a; }
@media (prefers-color-scheme: dark) { body { background: #16191d; color: #dfe3e8; } }
header { position: sticky; top: 0; padding: 6px 12px; font: 600 12px system-ui, sans-serif;
  background: #4f7a5a; color: #fff; }
pre { margin: 0; padding: 8px 0; counter-reset: line; }
.l { display: block; padding: 0 12px 0 0; white-space: pre; }
.l::before { counter-increment: line; content: counter(line); display: inline-block; width: 3.2em;
  margin-right: 12px; padding-right: 6px; text-align: right; opacity: .45; }
.hl { background: rgb(255 152 0 / 22%); }
${HIGHLIGHT_CSS}`;

function renderPopup() {
  if (!popup || popup.closed) {
    popup = null;
    return;
  }
  const doc = popup.document;
  const pre = doc.getElementById('code');
  if (!pre) {
    return;
  }
  pre.innerHTML = htmlLines.value
    .map((line, i) => `<span class="l${isHighlighted(i) ? ' hl' : ''}">${line}</span>`)
    .join('');
  doc.title = `flowBerry – ${props.beName}`;
  const header = doc.getElementById('name');
  if (header) {
    header.textContent = `${props.beName} – live aus flowBerry`;
  }
  if (range.value) {
    pre.children[range.value[0]]?.scrollIntoView({block: 'nearest'});
  }
}

function popOut() {
  if (popup && !popup.closed) {
    popup.focus();
    return;
  }
  popup = window.open('', 'flowberry-code', 'popup,width=760,height=900');
  if (!popup) {
    return;
  }
  const doc = popup.document;
  doc.head.innerHTML = '';
  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'utf-8');
  const style = doc.createElement('style');
  style.textContent = POPUP_CSS;
  doc.head.append(meta, style);
  const header = doc.createElement('header');
  header.id = 'name';
  const pre = doc.createElement('pre');
  pre.id = 'code';
  doc.body.replaceChildren(header, pre);
  renderPopup();
}

watch([htmlLines, range], renderPopup);

onBeforeUnmount(() => {
  popup?.close();
});
</script>

<style scoped>
.fb-codepanel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.fb-codepanel__bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--oc-role-outline-variant, #d0d4d9);
}

.fb-codepanel__name {
  flex: 1;
  overflow: hidden;
  font: 600 12px ui-monospace, monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fb-codepanel__code {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--oc-role-surface-container-lowest, var(--oc-role-surface, #fff));
}

.fb-codepanel__code pre {
  margin: 0;
  padding: 6px 0;
  font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.fb-codepanel__line {
  display: block;
  padding-right: 10px;
  white-space: pre;
}

.fb-codepanel__line::before {
  content: attr(data-line);
  display: inline-block;
  width: 2.8em;
  margin-right: 10px;
  padding-right: 6px;
  opacity: 0.4;
  text-align: right;
  user-select: none;
}

.fb-codepanel__line--hl {
  background: rgb(255 152 0 / 20%);
}

.fb-codepanel__primary {
  background: var(--oc-role-primary, #4f7a5a) !important;
  color: var(--oc-role-on-primary, #fff) !important;
  border-color: transparent !important;
}

.fb-codepanel :deep(.tok-c) {
  color: #7a8794;
  font-style: italic;
}

.fb-codepanel :deep(.tok-s) {
  color: #2e9e5b;
}

.fb-codepanel :deep(.tok-k) {
  color: #9a5cf0;
  font-weight: 600;
}

.fb-codepanel :deep(.tok-n) {
  color: #d0781f;
}
</style>
