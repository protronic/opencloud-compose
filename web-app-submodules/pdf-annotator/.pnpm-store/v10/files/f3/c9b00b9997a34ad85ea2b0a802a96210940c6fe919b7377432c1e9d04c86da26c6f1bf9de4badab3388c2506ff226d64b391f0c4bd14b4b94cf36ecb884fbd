Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const browser$1 = require('@sentry/core/browser');
const integration = require('./integration.js');
const normalizeStringifyValue = require('./normalizeStringifyValue.js');

function init(options = {}) {
  const opts = {
    defaultIntegrations: [...browser.getDefaultIntegrations(options), integration.vueIntegration()],
    ...options
  };
  browser$1.applySdkMetadata(opts, "vue");
  const client = browser.init(opts);
  browser$1.setNormalizeStringifier(normalizeStringifyValue.normalizeStringifyValue);
  return client;
}

exports.init = init;
//# sourceMappingURL=sdk.js.map
