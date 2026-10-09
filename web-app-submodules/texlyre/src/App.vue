<template>
  <div class="texlyre-app">
    <iframe
      v-if="frameSrc"
      class="texlyre-frame"
      :src="frameSrc"
      title="TeXlyre"
      allow="clipboard-read; clipboard-write; fullscreen"
      @load="frameLoaded = true"
    />
    <div v-if="!ready || errorText" class="texlyre-overlay" :class="{error: !!errorText}">
      <template v-if="errorText">
        <strong>TeXlyre</strong>
        <span>{{ errorText }}</span>
      </template>
      <template v-else>
        <span class="spinner" aria-hidden="true" />
        <strong>TeXlyre wird geladen …</strong>
        <span>Der Ordner „{{ folderLabel }}“ wird als Projekt geöffnet.</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import type {Resource, SpaceResource} from './ocContext';
import {createBridge, splitPath} from './ocBridge';

const props = withDefaults(
  defineProps<{
    resource: Resource;
    space?: SpaceResource;
    isReadOnly?: boolean;
    currentContent?: unknown;
  }>(),
  {isReadOnly: false, space: undefined, currentContent: undefined},
);

/**
 * TeXlyre is built with the absolute base /assets/apps/texlyre/app/
 * (scripts/build-texlyre.mjs) and needs a real document URL for its hash
 * routing - so it is loaded via src, not srcdoc. Same origin as OpenCloud,
 * which is how it reaches the bridge in this window.
 */
const FRAME_URL = '/assets/apps/texlyre/app/index.html';
const START_TIMEOUT_MS = 60000;

const frameSrc = ref('');
const frameLoaded = ref(false);
const ready = ref(false);
const errorText = ref('');
let watchdog = 0;

const folderLabel = computed(() => splitPath(props.resource?.path ?? '/').folder);

onMounted(() => {
  if (!props.space || !props.resource?.path) {
    errorText.value = 'Kein Speicherort - TeXlyre braucht eine Datei in einem OpenCloud-Space.';
    return;
  }
  if (window.__texlyreOpenCloud) {
    errorText.value = 'TeXlyre ist bereits in einem anderen Fenster dieser Sitzung geöffnet.';
    return;
  }
  window.__texlyreOpenCloud = createBridge({
    space: props.space,
    filePath: props.resource.path,
    readOnly: props.isReadOnly,
    onReady: () => {
      ready.value = true;
      window.clearTimeout(watchdog);
    },
  });
  frameSrc.value = FRAME_URL;
  watchdog = window.setTimeout(() => {
    if (ready.value) return;
    errorText.value = frameLoaded.value
      ? 'TeXlyre startet nicht (Browser-Konsole prüfen).'
      : `TeXlyre-Dateien nicht erreichbar (${FRAME_URL}).`;
  }, START_TIMEOUT_MS);
});

onBeforeUnmount(() => {
  window.clearTimeout(watchdog);
  delete window.__texlyreOpenCloud;
});
</script>

<style scoped>
.texlyre-app {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--oc-role-surface, #fff);
}

.texlyre-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.texlyre-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: var(--oc-role-surface, #fff);
  color: var(--oc-role-on-surface, #1d232a);
  font-size: 14px;
  text-align: center;
}

.texlyre-overlay.error {
  color: var(--oc-role-error, #b3261e);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--oc-role-outline-variant, #d0d4d9);
  border-top-color: var(--oc-role-primary, #3b6ea5);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
