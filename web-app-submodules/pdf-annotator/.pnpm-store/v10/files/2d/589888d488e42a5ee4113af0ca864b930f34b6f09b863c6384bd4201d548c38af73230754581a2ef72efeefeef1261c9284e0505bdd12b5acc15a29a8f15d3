import { normalizeStringifyValue as normalizeStringifyValue$1 } from '@sentry/browser';

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
  return normalizeStringifyValue$1(value);
}

export { normalizeStringifyValue };
//# sourceMappingURL=normalizeStringifyValue.js.map
