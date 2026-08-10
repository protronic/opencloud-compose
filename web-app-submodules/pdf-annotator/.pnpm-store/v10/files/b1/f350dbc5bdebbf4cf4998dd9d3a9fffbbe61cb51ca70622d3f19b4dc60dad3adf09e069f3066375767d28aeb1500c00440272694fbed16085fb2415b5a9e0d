Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const components = require('./vendor/components.js');

const attachErrorHandler = (app, options) => {
  const { errorHandler: originalErrorHandler } = app.config;
  app.config.errorHandler = (error, vm, lifecycleHook) => {
    const componentName = components.formatComponentName(vm, false);
    const trace = vm ? components.generateComponentTrace(vm) : "";
    const metadata = {
      componentName,
      lifecycleHook,
      trace
    };
    if (options?.attachProps !== false && vm) {
      if (vm.$options?.propsData) {
        metadata.propsData = vm.$options.propsData;
      } else if (vm.$props) {
        metadata.propsData = vm.$props;
      }
    }
    setTimeout(() => {
      core.captureException(error, {
        captureContext: { contexts: { vue: metadata } },
        mechanism: { handled: !!originalErrorHandler, type: "auto.function.vue.error_handler" }
      });
    });
    if (typeof originalErrorHandler === "function" && app.config.errorHandler) {
      originalErrorHandler.call(app, error, vm, lifecycleHook);
    } else {
      throw error;
    }
  };
};

exports.attachErrorHandler = attachErrorHandler;
//# sourceMappingURL=errorhandler.js.map
