Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const router = require('./router.js');

function browserTracingIntegration(options = {}) {
  if (!options.router) {
    return browser.browserTracingIntegration(options);
  }
  const integration = browser.browserTracingIntegration({
    ...options,
    instrumentNavigation: false
  });
  const { router: router$1, instrumentNavigation = true, instrumentPageLoad = true, routeLabel = "name" } = options;
  return {
    ...integration,
    afterAllSetup(client) {
      integration.afterAllSetup(client);
      const startNavigationSpan = (options2, destinationUrl) => {
        browser.startBrowserTracingNavigationSpan(client, options2, { url: destinationUrl });
      };
      router.instrumentVueRouter(router$1, { routeLabel, instrumentNavigation, instrumentPageLoad }, startNavigationSpan);
    }
  };
}

exports.browserTracingIntegration = browserTracingIntegration;
//# sourceMappingURL=browserTracingIntegration.js.map
