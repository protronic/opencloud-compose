import { browserTracingIntegration as browserTracingIntegration$1, startBrowserTracingNavigationSpan } from '@sentry/browser';
import { instrumentVueRouter } from './router.js';

function browserTracingIntegration(options = {}) {
  if (!options.router) {
    return browserTracingIntegration$1(options);
  }
  const integration = browserTracingIntegration$1({
    ...options,
    instrumentNavigation: false
  });
  const { router, instrumentNavigation = true, instrumentPageLoad = true, routeLabel = "name" } = options;
  return {
    ...integration,
    afterAllSetup(client) {
      integration.afterAllSetup(client);
      const startNavigationSpan = (options2, destinationUrl) => {
        startBrowserTracingNavigationSpan(client, options2, { url: destinationUrl });
      };
      instrumentVueRouter(router, { routeLabel, instrumentNavigation, instrumentPageLoad }, startNavigationSpan);
    }
  };
}

export { browserTracingIntegration };
//# sourceMappingURL=browserTracingIntegration.js.map
