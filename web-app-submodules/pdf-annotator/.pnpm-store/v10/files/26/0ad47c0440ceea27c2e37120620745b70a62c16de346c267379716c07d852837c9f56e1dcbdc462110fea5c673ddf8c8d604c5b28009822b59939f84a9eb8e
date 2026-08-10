import { getDefaultIntegrations, init as init$1 } from '@sentry/browser';
import { applySdkMetadata, setNormalizeStringifier } from '@sentry/core/browser';
import { vueIntegration } from './integration.js';
import { normalizeStringifyValue } from './normalizeStringifyValue.js';

function init(options = {}) {
  const opts = {
    defaultIntegrations: [...getDefaultIntegrations(options), vueIntegration()],
    ...options
  };
  applySdkMetadata(opts, "vue");
  const client = init$1(opts);
  setNormalizeStringifier(normalizeStringifyValue);
  return client;
}

export { init };
//# sourceMappingURL=sdk.js.map
