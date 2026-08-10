Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const constants = require('./constants.js');
const debugBuild = require('./debug-build.js');
const errorhandler = require('./errorhandler.js');
const tracing = require('./tracing.js');

const globalWithVue = core.GLOBAL_OBJ;
const DEFAULT_CONFIG = {
  Vue: globalWithVue.Vue,
  attachProps: true,
  attachErrorHandler: true,
  tracingOptions: {
    hooks: constants.DEFAULT_HOOKS,
    timeout: 2e3,
    trackComponents: false
  }
};
const INTEGRATION_NAME = "Vue";
const vueIntegration = core.defineIntegration((integrationOptions = {}) => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const options = { ...DEFAULT_CONFIG, ...client.getOptions(), ...integrationOptions };
      if (!options.Vue && !options.app) {
        core.consoleSandbox(() => {
          console.warn(
            "[@sentry/vue]: Misconfigured SDK. Vue specific errors will not be captured. Update your `Sentry.init` call with an appropriate config option: `app` (Application Instance - Vue 3) or `Vue` (Vue Constructor - Vue 2)."
          );
        });
        return;
      }
      if (options.app) {
        const apps = Array.isArray(options.app) ? options.app : [options.app];
        apps.forEach((app) => vueInit(app, options));
      } else if (options.Vue) {
        vueInit(options.Vue, options);
      }
    }
  };
});
const vueInit = (app, options) => {
  if (debugBuild.DEBUG_BUILD) {
    const appWithInstance = app;
    const isMounted = appWithInstance._instance?.isMounted;
    if (isMounted === true) {
      core.consoleSandbox(() => {
        console.warn(
          "[@sentry/vue]: Misconfigured SDK. Vue app is already mounted. Make sure to call `app.mount()` after `Sentry.init()`."
        );
      });
    }
  }
  if (options.attachErrorHandler) {
    errorhandler.attachErrorHandler(app, options);
  }
  if (core.hasSpansEnabled(options)) {
    app.mixin(tracing.createTracingMixins(options.tracingOptions));
  }
};

exports.vueIntegration = vueIntegration;
//# sourceMappingURL=integration.js.map
