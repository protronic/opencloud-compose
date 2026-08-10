Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const classifyRE = /(?:^|[-_])(\w)/g;
const classify = (str) => str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, "");
const ROOT_COMPONENT_NAME = "<Root>";
const ANONYMOUS_COMPONENT_NAME = "<Anonymous>";
const repeat = (str, n) => {
  return str.repeat(n);
};
const formatComponentName = (vm, includeFile) => {
  if (!vm) {
    return ANONYMOUS_COMPONENT_NAME;
  }
  if (vm.$root === vm) {
    return ROOT_COMPONENT_NAME;
  }
  if (!vm.$options) {
    return ANONYMOUS_COMPONENT_NAME;
  }
  const options = vm.$options;
  let name = options.name || options._componentTag || options.__name;
  const file = options.__file;
  if (!name && file) {
    const match = file.match(/([^/\\]+)\.vue$/);
    if (match) {
      name = match[1];
    }
  }
  return (name ? `<${classify(name)}>` : ANONYMOUS_COMPONENT_NAME) + (file && includeFile !== false ? ` at ${file}` : "");
};
const generateComponentTrace = (vm) => {
  if (vm && (vm._isVue || vm.__isVue) && vm.$parent) {
    const tree = [];
    let currentRecursiveSequence = 0;
    while (vm) {
      if (tree.length > 0) {
        const last = tree[tree.length - 1];
        if (last.constructor === vm.constructor) {
          currentRecursiveSequence++;
          vm = vm.$parent;
          continue;
        } else if (currentRecursiveSequence > 0) {
          tree[tree.length - 1] = [last, currentRecursiveSequence];
          currentRecursiveSequence = 0;
        }
      }
      tree.push(vm);
      vm = vm.$parent;
    }
    const formattedTree = tree.map(
      (vm2, i) => `${(i === 0 ? "---> " : repeat(" ", 5 + i * 2)) + (Array.isArray(vm2) ? `${formatComponentName(vm2[0])}... (${vm2[1]} recursive calls)` : formatComponentName(vm2))}`
    ).join("\n");
    return `

found in

${formattedTree}`;
  }
  return `

(found in ${formatComponentName(vm)})`;
};

exports.formatComponentName = formatComponentName;
exports.generateComponentTrace = generateComponentTrace;
//# sourceMappingURL=components.js.map
