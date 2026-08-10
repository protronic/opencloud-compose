import { startInactiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, getActiveSpan } from '@sentry/browser';
import { uniq, debug, timestampInSeconds } from '@sentry/core';
import { DEFAULT_HOOKS } from './constants.js';
import { DEBUG_BUILD } from './debug-build.js';
import { formatComponentName } from './vendor/components.js';

const VUE_OP = "ui.vue";
const HOOKS = {
  activate: ["activated", "deactivated"],
  create: ["beforeCreate", "created"],
  // Vue 3
  unmount: ["beforeUnmount", "unmounted"],
  // Vue 2
  destroy: ["beforeDestroy", "destroyed"],
  mount: ["beforeMount", "mounted"],
  update: ["beforeUpdate", "updated"]
};
function maybeEndRootComponentSpan(vm, timestamp, timeout) {
  if (vm.$_sentryRootComponentSpanTimer) {
    clearTimeout(vm.$_sentryRootComponentSpanTimer);
  }
  vm.$_sentryRootComponentSpanTimer = setTimeout(() => {
    if (vm.$root?.$_sentryRootComponentSpan) {
      vm.$root.$_sentryRootComponentSpan.end(timestamp);
      vm.$root.$_sentryRootComponentSpan = void 0;
    }
  }, timeout);
}
function findTrackComponent(trackComponents, formattedName) {
  function extractComponentName(name) {
    return name.replace(/^<([^\s]*)>(?: at [^\s]*)?$/, "$1");
  }
  const isMatched = trackComponents.some((compo) => {
    return extractComponentName(formattedName) === extractComponentName(compo);
  });
  return isMatched;
}
const createTracingMixins = (options = {}) => {
  const hooks = uniq((options.hooks || []).concat(DEFAULT_HOOKS));
  const mixins = {};
  const rootComponentSpanFinalTimeout = options.timeout || 2e3;
  for (const operation of hooks) {
    const internalHooks = HOOKS[operation];
    if (!internalHooks) {
      DEBUG_BUILD && debug.warn(`Unknown hook: ${operation}`);
      continue;
    }
    for (const internalHook of internalHooks) {
      mixins[internalHook] = function() {
        const isRootComponent = this.$root === this;
        if (isRootComponent) {
          this.$_sentryRootComponentSpan = this.$_sentryRootComponentSpan || startInactiveSpan({
            name: "Application Render",
            op: `${VUE_OP}.render`,
            attributes: {
              [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.vue"
            },
            onlyIfParent: true
          });
          maybeEndRootComponentSpan(this, timestampInSeconds(), rootComponentSpanFinalTimeout);
        }
        const componentName = formatComponentName(this, false);
        const shouldTrack = isRootComponent || // We always want to track the root component
        (Array.isArray(options.trackComponents) ? findTrackComponent(options.trackComponents, componentName) : options.trackComponents);
        if (!shouldTrack) {
          maybeEndRootComponentSpan(this, timestampInSeconds(), rootComponentSpanFinalTimeout);
          return;
        }
        this.$_sentryComponentSpans = this.$_sentryComponentSpans || {};
        const isBeforeHook = internalHook === internalHooks[0];
        const activeSpan = this.$root?.$_sentryRootComponentSpan || getActiveSpan();
        if (isBeforeHook) {
          if (activeSpan) {
            const oldSpan = this.$_sentryComponentSpans[operation];
            if (oldSpan) {
              oldSpan.end();
            }
            this.$_sentryComponentSpans[operation] = startInactiveSpan({
              name: `Vue ${componentName}`,
              op: `${VUE_OP}.${operation}`,
              attributes: {
                [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.vue"
              },
              // UI spans should only be created if there is an active root span (transaction)
              onlyIfParent: true
            });
          }
        } else {
          const span = this.$_sentryComponentSpans[operation];
          if (!span) return;
          span.end();
          maybeEndRootComponentSpan(this, timestampInSeconds(), rootComponentSpanFinalTimeout);
        }
      };
    }
  }
  return mixins;
};

export { createTracingMixins, findTrackComponent };
//# sourceMappingURL=tracing.js.map
