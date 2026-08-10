Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');
const constants = require('./constants.js');
const debugBuild = require('./debug-build.js');
const components = require('./vendor/components.js');

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
  const hooks = core.uniq((options.hooks || []).concat(constants.DEFAULT_HOOKS));
  const mixins = {};
  const rootComponentSpanFinalTimeout = options.timeout || 2e3;
  for (const operation of hooks) {
    const internalHooks = HOOKS[operation];
    if (!internalHooks) {
      debugBuild.DEBUG_BUILD && core.debug.warn(`Unknown hook: ${operation}`);
      continue;
    }
    for (const internalHook of internalHooks) {
      mixins[internalHook] = function() {
        const isRootComponent = this.$root === this;
        if (isRootComponent) {
          this.$_sentryRootComponentSpan = this.$_sentryRootComponentSpan || browser.startInactiveSpan({
            name: "Application Render",
            op: `${VUE_OP}.render`,
            attributes: {
              [browser.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.vue"
            },
            onlyIfParent: true
          });
          maybeEndRootComponentSpan(this, core.timestampInSeconds(), rootComponentSpanFinalTimeout);
        }
        const componentName = components.formatComponentName(this, false);
        const shouldTrack = isRootComponent || // We always want to track the root component
        (Array.isArray(options.trackComponents) ? findTrackComponent(options.trackComponents, componentName) : options.trackComponents);
        if (!shouldTrack) {
          maybeEndRootComponentSpan(this, core.timestampInSeconds(), rootComponentSpanFinalTimeout);
          return;
        }
        this.$_sentryComponentSpans = this.$_sentryComponentSpans || {};
        const isBeforeHook = internalHook === internalHooks[0];
        const activeSpan = this.$root?.$_sentryRootComponentSpan || browser.getActiveSpan();
        if (isBeforeHook) {
          if (activeSpan) {
            const oldSpan = this.$_sentryComponentSpans[operation];
            if (oldSpan) {
              oldSpan.end();
            }
            this.$_sentryComponentSpans[operation] = browser.startInactiveSpan({
              name: `Vue ${componentName}`,
              op: `${VUE_OP}.${operation}`,
              attributes: {
                [browser.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: "auto.ui.vue"
              },
              // UI spans should only be created if there is an active root span (transaction)
              onlyIfParent: true
            });
          }
        } else {
          const span = this.$_sentryComponentSpans[operation];
          if (!span) return;
          span.end();
          maybeEndRootComponentSpan(this, core.timestampInSeconds(), rootComponentSpanFinalTimeout);
        }
      };
    }
  }
  return mixins;
};

exports.createTracingMixins = createTracingMixins;
exports.findTrackComponent = findTrackComponent;
//# sourceMappingURL=tracing.js.map
