Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');

function isVueViewModel(wat) {
  return !!(typeof wat === "object" && wat && (wat.__isVue || wat._isVue));
}
function isVNode(wat) {
  return !!(typeof wat === "object" && wat?.__v_isVNode);
}
function normalizeStringifyValue(value) {
  if (isVueViewModel(value)) {
    return "[VueViewModel]";
  }
  if (isVNode(value)) {
    return "[VueVNode]";
  }
  return browser.normalizeStringifyValue(value);
}

exports.normalizeStringifyValue = normalizeStringifyValue;
//# sourceMappingURL=normalizeStringifyValue.js.map
