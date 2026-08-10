import { i as __toESM, t as require_po } from "./po-BAjmEwRO.js";
//#region node_modules/@vue/shared/dist/shared.esm-bundler.js
/**
* @vue/shared v3.5.34
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/* @__NO_SIDE_EFFECTS__ */
function makeMap(str) {
	const map = /* @__PURE__ */ Object.create(null);
	for (const key of str.split(",")) map[key] = 1;
	return (val) => val in map;
}
const EMPTY_OBJ = Object.freeze({});
Object.freeze([]);
const NOOP = () => {};
const extend = Object.assign;
const remove = (arr, el) => {
	const i = arr.indexOf(el);
	if (i > -1) arr.splice(i, 1);
};
const hasOwnProperty$1 = Object.prototype.hasOwnProperty;
const hasOwn = (val, key) => hasOwnProperty$1.call(val, key);
const isArray = Array.isArray;
const isMap = (val) => toTypeString(val) === "[object Map]";
const isSet = (val) => toTypeString(val) === "[object Set]";
const isFunction = (val) => typeof val === "function";
const isString = (val) => typeof val === "string";
const isSymbol = (val) => typeof val === "symbol";
const isObject = (val) => val !== null && typeof val === "object";
const isPromise = (val) => {
	return (isObject(val) || isFunction(val)) && isFunction(val.then) && isFunction(val.catch);
};
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const toRawType = (value) => {
	return toTypeString(value).slice(8, -1);
};
const isPlainObject = (val) => toTypeString(val) === "[object Object]";
const isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
const cacheStringFunction = (fn) => {
	const cache = /* @__PURE__ */ Object.create(null);
	return ((str) => {
		return cache[str] || (cache[str] = fn(str));
	});
};
const capitalize = cacheStringFunction((str) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
});
const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
const def = (obj, key, value, writable = false) => {
	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: false,
		writable,
		value
	});
};
let _globalThis;
const getGlobalThis = () => {
	return _globalThis || (_globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
};
//#endregion
//#region node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
/**
* @vue/reactivity v3.5.34
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function warn(msg, ...args) {
	console.warn(`[Vue warn] ${msg}`, ...args);
}
let activeEffectScope;
function getCurrentScope() {
	return activeEffectScope;
}
let activeSub;
const pausedQueueEffects = /* @__PURE__ */ new WeakSet();
var ReactiveEffect = class {
	constructor(fn) {
		this.fn = fn;
		/**
		* @internal
		*/
		this.deps = void 0;
		/**
		* @internal
		*/
		this.depsTail = void 0;
		/**
		* @internal
		*/
		this.flags = 5;
		/**
		* @internal
		*/
		this.next = void 0;
		/**
		* @internal
		*/
		this.cleanup = void 0;
		this.scheduler = void 0;
	}
	pause() {
		this.flags |= 64;
	}
	resume() {
		if (this.flags & 64) {
			this.flags &= -65;
			if (pausedQueueEffects.has(this)) {
				pausedQueueEffects.delete(this);
				this.trigger();
			}
		}
	}
	/**
	* @internal
	*/
	notify() {
		if (this.flags & 2 && !(this.flags & 32)) return;
		if (!(this.flags & 8)) batch(this);
	}
	run() {
		if (!(this.flags & 1)) return this.fn();
		this.flags |= 2;
		cleanupEffect(this);
		prepareDeps(this);
		const prevEffect = activeSub;
		const prevShouldTrack = shouldTrack;
		activeSub = this;
		shouldTrack = true;
		try {
			return this.fn();
		} finally {
			if (activeSub !== this) warn("Active effect was not restored correctly - this is likely a Vue internal bug.");
			cleanupDeps(this);
			activeSub = prevEffect;
			shouldTrack = prevShouldTrack;
			this.flags &= -3;
		}
	}
	stop() {
		if (this.flags & 1) {
			for (let link = this.deps; link; link = link.nextDep) removeSub(link);
			this.deps = this.depsTail = void 0;
			cleanupEffect(this);
			this.onStop && this.onStop();
			this.flags &= -2;
		}
	}
	trigger() {
		if (this.flags & 64) pausedQueueEffects.add(this);
		else if (this.scheduler) this.scheduler();
		else this.runIfDirty();
	}
	/**
	* @internal
	*/
	runIfDirty() {
		if (isDirty(this)) this.run();
	}
	get dirty() {
		return isDirty(this);
	}
};
let batchDepth = 0;
let batchedSub;
let batchedComputed;
function batch(sub, isComputed = false) {
	sub.flags |= 8;
	if (isComputed) {
		sub.next = batchedComputed;
		batchedComputed = sub;
		return;
	}
	sub.next = batchedSub;
	batchedSub = sub;
}
function startBatch() {
	batchDepth++;
}
function endBatch() {
	if (--batchDepth > 0) return;
	if (batchedComputed) {
		let e = batchedComputed;
		batchedComputed = void 0;
		while (e) {
			const next = e.next;
			e.next = void 0;
			e.flags &= -9;
			e = next;
		}
	}
	let error;
	while (batchedSub) {
		let e = batchedSub;
		batchedSub = void 0;
		while (e) {
			const next = e.next;
			e.next = void 0;
			e.flags &= -9;
			if (e.flags & 1) try {
				e.trigger();
			} catch (err) {
				if (!error) error = err;
			}
			e = next;
		}
	}
	if (error) throw error;
}
function prepareDeps(sub) {
	for (let link = sub.deps; link; link = link.nextDep) {
		link.version = -1;
		link.prevActiveLink = link.dep.activeLink;
		link.dep.activeLink = link;
	}
}
function cleanupDeps(sub) {
	let head;
	let tail = sub.depsTail;
	let link = tail;
	while (link) {
		const prev = link.prevDep;
		if (link.version === -1) {
			if (link === tail) tail = prev;
			removeSub(link);
			removeDep(link);
		} else head = link;
		link.dep.activeLink = link.prevActiveLink;
		link.prevActiveLink = void 0;
		link = prev;
	}
	sub.deps = head;
	sub.depsTail = tail;
}
function isDirty(sub) {
	for (let link = sub.deps; link; link = link.nextDep) if (link.dep.version !== link.version || link.dep.computed && (refreshComputed(link.dep.computed) || link.dep.version !== link.version)) return true;
	if (sub._dirty) return true;
	return false;
}
function refreshComputed(computed) {
	if (computed.flags & 4 && !(computed.flags & 16)) return;
	computed.flags &= -17;
	if (computed.globalVersion === globalVersion) return;
	computed.globalVersion = globalVersion;
	if (!computed.isSSR && computed.flags & 128 && (!computed.deps && !computed._dirty || !isDirty(computed))) return;
	computed.flags |= 2;
	const dep = computed.dep;
	const prevSub = activeSub;
	const prevShouldTrack = shouldTrack;
	activeSub = computed;
	shouldTrack = true;
	try {
		prepareDeps(computed);
		const value = computed.fn(computed._value);
		if (dep.version === 0 || hasChanged(value, computed._value)) {
			computed.flags |= 128;
			computed._value = value;
			dep.version++;
		}
	} catch (err) {
		dep.version++;
		throw err;
	} finally {
		activeSub = prevSub;
		shouldTrack = prevShouldTrack;
		cleanupDeps(computed);
		computed.flags &= -3;
	}
}
function removeSub(link, soft = false) {
	const { dep, prevSub, nextSub } = link;
	if (prevSub) {
		prevSub.nextSub = nextSub;
		link.prevSub = void 0;
	}
	if (nextSub) {
		nextSub.prevSub = prevSub;
		link.nextSub = void 0;
	}
	if (dep.subsHead === link) dep.subsHead = nextSub;
	if (dep.subs === link) {
		dep.subs = prevSub;
		if (!prevSub && dep.computed) {
			dep.computed.flags &= -5;
			for (let l = dep.computed.deps; l; l = l.nextDep) removeSub(l, true);
		}
	}
	if (!soft && !--dep.sc && dep.map) dep.map.delete(dep.key);
}
function removeDep(link) {
	const { prevDep, nextDep } = link;
	if (prevDep) {
		prevDep.nextDep = nextDep;
		link.prevDep = void 0;
	}
	if (nextDep) {
		nextDep.prevDep = prevDep;
		link.nextDep = void 0;
	}
}
let shouldTrack = true;
const trackStack = [];
function pauseTracking() {
	trackStack.push(shouldTrack);
	shouldTrack = false;
}
function resetTracking() {
	const last = trackStack.pop();
	shouldTrack = last === void 0 ? true : last;
}
function cleanupEffect(e) {
	const { cleanup } = e;
	e.cleanup = void 0;
	if (cleanup) {
		const prevSub = activeSub;
		activeSub = void 0;
		try {
			cleanup();
		} finally {
			activeSub = prevSub;
		}
	}
}
let globalVersion = 0;
var Link = class {
	constructor(sub, dep) {
		this.sub = sub;
		this.dep = dep;
		this.version = dep.version;
		this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
	}
};
var Dep = class {
	constructor(computed) {
		this.computed = computed;
		this.version = 0;
		/**
		* Link between this dep and the current active effect
		*/
		this.activeLink = void 0;
		/**
		* Doubly linked list representing the subscribing effects (tail)
		*/
		this.subs = void 0;
		/**
		* For object property deps cleanup
		*/
		this.map = void 0;
		this.key = void 0;
		/**
		* Subscriber counter
		*/
		this.sc = 0;
		/**
		* @internal
		*/
		this.__v_skip = true;
		this.subsHead = void 0;
	}
	track(debugInfo) {
		if (!activeSub || !shouldTrack || activeSub === this.computed) return;
		let link = this.activeLink;
		if (link === void 0 || link.sub !== activeSub) {
			link = this.activeLink = new Link(activeSub, this);
			if (!activeSub.deps) activeSub.deps = activeSub.depsTail = link;
			else {
				link.prevDep = activeSub.depsTail;
				activeSub.depsTail.nextDep = link;
				activeSub.depsTail = link;
			}
			addSub(link);
		} else if (link.version === -1) {
			link.version = this.version;
			if (link.nextDep) {
				const next = link.nextDep;
				next.prevDep = link.prevDep;
				if (link.prevDep) link.prevDep.nextDep = next;
				link.prevDep = activeSub.depsTail;
				link.nextDep = void 0;
				activeSub.depsTail.nextDep = link;
				activeSub.depsTail = link;
				if (activeSub.deps === link) activeSub.deps = next;
			}
		}
		if (activeSub.onTrack) activeSub.onTrack(extend({ effect: activeSub }, debugInfo));
		return link;
	}
	trigger(debugInfo) {
		this.version++;
		globalVersion++;
		this.notify(debugInfo);
	}
	notify(debugInfo) {
		startBatch();
		try {
			for (let head = this.subsHead; head; head = head.nextSub) if (head.sub.onTrigger && !(head.sub.flags & 8)) head.sub.onTrigger(extend({ effect: head.sub }, debugInfo));
			for (let link = this.subs; link; link = link.prevSub) if (link.sub.notify()) link.sub.dep.notify();
		} finally {
			endBatch();
		}
	}
};
function addSub(link) {
	link.dep.sc++;
	if (link.sub.flags & 4) {
		const computed = link.dep.computed;
		if (computed && !link.dep.subs) {
			computed.flags |= 20;
			for (let l = computed.deps; l; l = l.nextDep) addSub(l);
		}
		const currentTail = link.dep.subs;
		if (currentTail !== link) {
			link.prevSub = currentTail;
			if (currentTail) currentTail.nextSub = link;
		}
		if (link.dep.subsHead === void 0) link.dep.subsHead = link;
		link.dep.subs = link;
	}
}
const targetMap = /* @__PURE__ */ new WeakMap();
const ITERATE_KEY = /* @__PURE__ */ Symbol("Object iterate");
const MAP_KEY_ITERATE_KEY = /* @__PURE__ */ Symbol("Map keys iterate");
const ARRAY_ITERATE_KEY = /* @__PURE__ */ Symbol("Array iterate");
function track(target, type, key) {
	if (shouldTrack && activeSub) {
		let depsMap = targetMap.get(target);
		if (!depsMap) targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
		let dep = depsMap.get(key);
		if (!dep) {
			depsMap.set(key, dep = new Dep());
			dep.map = depsMap;
			dep.key = key;
		}
		dep.track({
			target,
			type,
			key
		});
	}
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
	const depsMap = targetMap.get(target);
	if (!depsMap) {
		globalVersion++;
		return;
	}
	const run = (dep) => {
		if (dep) dep.trigger({
			target,
			type,
			key,
			newValue,
			oldValue,
			oldTarget
		});
	};
	startBatch();
	if (type === "clear") depsMap.forEach(run);
	else {
		const targetIsArray = isArray(target);
		const isArrayIndex = targetIsArray && isIntegerKey(key);
		if (targetIsArray && key === "length") {
			const newLength = Number(newValue);
			depsMap.forEach((dep, key2) => {
				if (key2 === "length" || key2 === ARRAY_ITERATE_KEY || !isSymbol(key2) && key2 >= newLength) run(dep);
			});
		} else {
			if (key !== void 0 || depsMap.has(void 0)) run(depsMap.get(key));
			if (isArrayIndex) run(depsMap.get(ARRAY_ITERATE_KEY));
			switch (type) {
				case "add":
					if (!targetIsArray) {
						run(depsMap.get(ITERATE_KEY));
						if (isMap(target)) run(depsMap.get(MAP_KEY_ITERATE_KEY));
					} else if (isArrayIndex) run(depsMap.get("length"));
					break;
				case "delete":
					if (!targetIsArray) {
						run(depsMap.get(ITERATE_KEY));
						if (isMap(target)) run(depsMap.get(MAP_KEY_ITERATE_KEY));
					}
					break;
				case "set":
					if (isMap(target)) run(depsMap.get(ITERATE_KEY));
					break;
			}
		}
	}
	endBatch();
}
function reactiveReadArray(array) {
	const raw = /* @__PURE__ */ toRaw(array);
	if (raw === array) return raw;
	track(raw, "iterate", ARRAY_ITERATE_KEY);
	return /* @__PURE__ */ isShallow(array) ? raw : raw.map(toReactive);
}
function shallowReadArray(arr) {
	track(arr = /* @__PURE__ */ toRaw(arr), "iterate", ARRAY_ITERATE_KEY);
	return arr;
}
function toWrapped(target, item) {
	if (/* @__PURE__ */ isReadonly(target)) return /* @__PURE__ */ isReactive(target) ? toReadonly(toReactive(item)) : toReadonly(item);
	return toReactive(item);
}
const arrayInstrumentations = {
	__proto__: null,
	[Symbol.iterator]() {
		return iterator(this, Symbol.iterator, (item) => toWrapped(this, item));
	},
	concat(...args) {
		return reactiveReadArray(this).concat(...args.map((x) => isArray(x) ? reactiveReadArray(x) : x));
	},
	entries() {
		return iterator(this, "entries", (value) => {
			value[1] = toWrapped(this, value[1]);
			return value;
		});
	},
	every(fn, thisArg) {
		return apply(this, "every", fn, thisArg, void 0, arguments);
	},
	filter(fn, thisArg) {
		return apply(this, "filter", fn, thisArg, (v) => v.map((item) => toWrapped(this, item)), arguments);
	},
	find(fn, thisArg) {
		return apply(this, "find", fn, thisArg, (item) => toWrapped(this, item), arguments);
	},
	findIndex(fn, thisArg) {
		return apply(this, "findIndex", fn, thisArg, void 0, arguments);
	},
	findLast(fn, thisArg) {
		return apply(this, "findLast", fn, thisArg, (item) => toWrapped(this, item), arguments);
	},
	findLastIndex(fn, thisArg) {
		return apply(this, "findLastIndex", fn, thisArg, void 0, arguments);
	},
	forEach(fn, thisArg) {
		return apply(this, "forEach", fn, thisArg, void 0, arguments);
	},
	includes(...args) {
		return searchProxy(this, "includes", args);
	},
	indexOf(...args) {
		return searchProxy(this, "indexOf", args);
	},
	join(separator) {
		return reactiveReadArray(this).join(separator);
	},
	lastIndexOf(...args) {
		return searchProxy(this, "lastIndexOf", args);
	},
	map(fn, thisArg) {
		return apply(this, "map", fn, thisArg, void 0, arguments);
	},
	pop() {
		return noTracking(this, "pop");
	},
	push(...args) {
		return noTracking(this, "push", args);
	},
	reduce(fn, ...args) {
		return reduce(this, "reduce", fn, args);
	},
	reduceRight(fn, ...args) {
		return reduce(this, "reduceRight", fn, args);
	},
	shift() {
		return noTracking(this, "shift");
	},
	some(fn, thisArg) {
		return apply(this, "some", fn, thisArg, void 0, arguments);
	},
	splice(...args) {
		return noTracking(this, "splice", args);
	},
	toReversed() {
		return reactiveReadArray(this).toReversed();
	},
	toSorted(comparer) {
		return reactiveReadArray(this).toSorted(comparer);
	},
	toSpliced(...args) {
		return reactiveReadArray(this).toSpliced(...args);
	},
	unshift(...args) {
		return noTracking(this, "unshift", args);
	},
	values() {
		return iterator(this, "values", (item) => toWrapped(this, item));
	}
};
function iterator(self, method, wrapValue) {
	const arr = shallowReadArray(self);
	const iter = arr[method]();
	if (arr !== self && !/* @__PURE__ */ isShallow(self)) {
		iter._next = iter.next;
		iter.next = () => {
			const result = iter._next();
			if (!result.done) result.value = wrapValue(result.value);
			return result;
		};
	}
	return iter;
}
const arrayProto = Array.prototype;
function apply(self, method, fn, thisArg, wrappedRetFn, args) {
	const arr = shallowReadArray(self);
	const needsWrap = arr !== self && !/* @__PURE__ */ isShallow(self);
	const methodFn = arr[method];
	if (methodFn !== arrayProto[method]) {
		const result2 = methodFn.apply(self, args);
		return needsWrap ? toReactive(result2) : result2;
	}
	let wrappedFn = fn;
	if (arr !== self) {
		if (needsWrap) wrappedFn = function(item, index) {
			return fn.call(this, toWrapped(self, item), index, self);
		};
		else if (fn.length > 2) wrappedFn = function(item, index) {
			return fn.call(this, item, index, self);
		};
	}
	const result = methodFn.call(arr, wrappedFn, thisArg);
	return needsWrap && wrappedRetFn ? wrappedRetFn(result) : result;
}
function reduce(self, method, fn, args) {
	const arr = shallowReadArray(self);
	const needsWrap = arr !== self && !/* @__PURE__ */ isShallow(self);
	let wrappedFn = fn;
	let wrapInitialAccumulator = false;
	if (arr !== self) {
		if (needsWrap) {
			wrapInitialAccumulator = args.length === 0;
			wrappedFn = function(acc, item, index) {
				if (wrapInitialAccumulator) {
					wrapInitialAccumulator = false;
					acc = toWrapped(self, acc);
				}
				return fn.call(this, acc, toWrapped(self, item), index, self);
			};
		} else if (fn.length > 3) wrappedFn = function(acc, item, index) {
			return fn.call(this, acc, item, index, self);
		};
	}
	const result = arr[method](wrappedFn, ...args);
	return wrapInitialAccumulator ? toWrapped(self, result) : result;
}
function searchProxy(self, method, args) {
	const arr = /* @__PURE__ */ toRaw(self);
	track(arr, "iterate", ARRAY_ITERATE_KEY);
	const res = arr[method](...args);
	if ((res === -1 || res === false) && /* @__PURE__ */ isProxy(args[0])) {
		args[0] = /* @__PURE__ */ toRaw(args[0]);
		return arr[method](...args);
	}
	return res;
}
function noTracking(self, method, args = []) {
	pauseTracking();
	startBatch();
	const res = (/* @__PURE__ */ toRaw(self))[method].apply(self, args);
	endBatch();
	resetTracking();
	return res;
}
const isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
const builtInSymbols = new Set(/* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((key) => key !== "arguments" && key !== "caller").map((key) => Symbol[key]).filter(isSymbol));
function hasOwnProperty(key) {
	if (!isSymbol(key)) key = String(key);
	const obj = /* @__PURE__ */ toRaw(this);
	track(obj, "has", key);
	return obj.hasOwnProperty(key);
}
var BaseReactiveHandler = class {
	constructor(_isReadonly = false, _isShallow = false) {
		this._isReadonly = _isReadonly;
		this._isShallow = _isShallow;
	}
	get(target, key, receiver) {
		if (key === "__v_skip") return target["__v_skip"];
		const isReadonly2 = this._isReadonly, isShallow2 = this._isShallow;
		if (key === "__v_isReactive") return !isReadonly2;
		else if (key === "__v_isReadonly") return isReadonly2;
		else if (key === "__v_isShallow") return isShallow2;
		else if (key === "__v_raw") {
			if (receiver === (isReadonly2 ? isShallow2 ? shallowReadonlyMap : readonlyMap : isShallow2 ? shallowReactiveMap : reactiveMap).get(target) || Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)) return target;
			return;
		}
		const targetIsArray = isArray(target);
		if (!isReadonly2) {
			let fn;
			if (targetIsArray && (fn = arrayInstrumentations[key])) return fn;
			if (key === "hasOwnProperty") return hasOwnProperty;
		}
		const res = Reflect.get(target, key, /* @__PURE__ */ isRef(target) ? target : receiver);
		if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) return res;
		if (!isReadonly2) track(target, "get", key);
		if (isShallow2) return res;
		if (/* @__PURE__ */ isRef(res)) {
			const value = targetIsArray && isIntegerKey(key) ? res : res.value;
			return isReadonly2 && isObject(value) ? /* @__PURE__ */ readonly(value) : value;
		}
		if (isObject(res)) return isReadonly2 ? /* @__PURE__ */ readonly(res) : /* @__PURE__ */ reactive(res);
		return res;
	}
};
var MutableReactiveHandler = class extends BaseReactiveHandler {
	constructor(isShallow2 = false) {
		super(false, isShallow2);
	}
	set(target, key, value, receiver) {
		let oldValue = target[key];
		const isArrayWithIntegerKey = isArray(target) && isIntegerKey(key);
		if (!this._isShallow) {
			const isOldValueReadonly = /* @__PURE__ */ isReadonly(oldValue);
			if (!/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value)) {
				oldValue = /* @__PURE__ */ toRaw(oldValue);
				value = /* @__PURE__ */ toRaw(value);
			}
			if (!isArrayWithIntegerKey && /* @__PURE__ */ isRef(oldValue) && !/* @__PURE__ */ isRef(value)) if (isOldValueReadonly) {
				warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target[key]);
				return true;
			} else {
				oldValue.value = value;
				return true;
			}
		}
		const hadKey = isArrayWithIntegerKey ? Number(key) < target.length : hasOwn(target, key);
		const result = Reflect.set(target, key, value, /* @__PURE__ */ isRef(target) ? target : receiver);
		if (target === /* @__PURE__ */ toRaw(receiver)) {
			if (!hadKey) trigger(target, "add", key, value);
			else if (hasChanged(value, oldValue)) trigger(target, "set", key, value, oldValue);
		}
		return result;
	}
	deleteProperty(target, key) {
		const hadKey = hasOwn(target, key);
		const oldValue = target[key];
		const result = Reflect.deleteProperty(target, key);
		if (result && hadKey) trigger(target, "delete", key, void 0, oldValue);
		return result;
	}
	has(target, key) {
		const result = Reflect.has(target, key);
		if (!isSymbol(key) || !builtInSymbols.has(key)) track(target, "has", key);
		return result;
	}
	ownKeys(target) {
		track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
		return Reflect.ownKeys(target);
	}
};
var ReadonlyReactiveHandler = class extends BaseReactiveHandler {
	constructor(isShallow2 = false) {
		super(true, isShallow2);
	}
	set(target, key) {
		warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
		return true;
	}
	deleteProperty(target, key) {
		warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
		return true;
	}
};
const mutableHandlers = /* @__PURE__ */ new MutableReactiveHandler();
const readonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler();
const shallowReadonlyHandlers = /* @__PURE__ */ new ReadonlyReactiveHandler(true);
const toShallow = (value) => value;
const getProto = (v) => Reflect.getPrototypeOf(v);
function createIterableMethod(method, isReadonly2, isShallow2) {
	return function(...args) {
		const target = this["__v_raw"];
		const rawTarget = /* @__PURE__ */ toRaw(target);
		const targetIsMap = isMap(rawTarget);
		const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
		const isKeyOnly = method === "keys" && targetIsMap;
		const innerIterator = target[method](...args);
		const wrap = isShallow2 ? toShallow : isReadonly2 ? toReadonly : toReactive;
		!isReadonly2 && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
		return extend(Object.create(innerIterator), { next() {
			const { value, done } = innerIterator.next();
			return done ? {
				value,
				done
			} : {
				value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
				done
			};
		} });
	};
}
function createReadonlyMethod(type) {
	return function(...args) {
		{
			const key = args[0] ? `on key "${args[0]}" ` : ``;
			warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, /* @__PURE__ */ toRaw(this));
		}
		return type === "delete" ? false : type === "clear" ? void 0 : this;
	};
}
function createInstrumentations(readonly, shallow) {
	const instrumentations = {
		get(key) {
			const target = this["__v_raw"];
			const rawTarget = /* @__PURE__ */ toRaw(target);
			const rawKey = /* @__PURE__ */ toRaw(key);
			if (!readonly) {
				if (hasChanged(key, rawKey)) track(rawTarget, "get", key);
				track(rawTarget, "get", rawKey);
			}
			const { has } = getProto(rawTarget);
			const wrap = shallow ? toShallow : readonly ? toReadonly : toReactive;
			if (has.call(rawTarget, key)) return wrap(target.get(key));
			else if (has.call(rawTarget, rawKey)) return wrap(target.get(rawKey));
			else if (target !== rawTarget) target.get(key);
		},
		get size() {
			const target = this["__v_raw"];
			!readonly && track(/* @__PURE__ */ toRaw(target), "iterate", ITERATE_KEY);
			return target.size;
		},
		has(key) {
			const target = this["__v_raw"];
			const rawTarget = /* @__PURE__ */ toRaw(target);
			const rawKey = /* @__PURE__ */ toRaw(key);
			if (!readonly) {
				if (hasChanged(key, rawKey)) track(rawTarget, "has", key);
				track(rawTarget, "has", rawKey);
			}
			return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
		},
		forEach(callback, thisArg) {
			const observed = this;
			const target = observed["__v_raw"];
			const rawTarget = /* @__PURE__ */ toRaw(target);
			const wrap = shallow ? toShallow : readonly ? toReadonly : toReactive;
			!readonly && track(rawTarget, "iterate", ITERATE_KEY);
			return target.forEach((value, key) => {
				return callback.call(thisArg, wrap(value), wrap(key), observed);
			});
		}
	};
	extend(instrumentations, readonly ? {
		add: createReadonlyMethod("add"),
		set: createReadonlyMethod("set"),
		delete: createReadonlyMethod("delete"),
		clear: createReadonlyMethod("clear")
	} : {
		add(value) {
			const target = /* @__PURE__ */ toRaw(this);
			const proto = getProto(target);
			const rawValue = /* @__PURE__ */ toRaw(value);
			const valueToAdd = !shallow && !/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value) ? rawValue : value;
			if (!(proto.has.call(target, valueToAdd) || hasChanged(value, valueToAdd) && proto.has.call(target, value) || hasChanged(rawValue, valueToAdd) && proto.has.call(target, rawValue))) {
				target.add(valueToAdd);
				trigger(target, "add", valueToAdd, valueToAdd);
			}
			return this;
		},
		set(key, value) {
			if (!shallow && !/* @__PURE__ */ isShallow(value) && !/* @__PURE__ */ isReadonly(value)) value = /* @__PURE__ */ toRaw(value);
			const target = /* @__PURE__ */ toRaw(this);
			const { has, get } = getProto(target);
			let hadKey = has.call(target, key);
			if (!hadKey) {
				key = /* @__PURE__ */ toRaw(key);
				hadKey = has.call(target, key);
			} else checkIdentityKeys(target, has, key);
			const oldValue = get.call(target, key);
			target.set(key, value);
			if (!hadKey) trigger(target, "add", key, value);
			else if (hasChanged(value, oldValue)) trigger(target, "set", key, value, oldValue);
			return this;
		},
		delete(key) {
			const target = /* @__PURE__ */ toRaw(this);
			const { has, get } = getProto(target);
			let hadKey = has.call(target, key);
			if (!hadKey) {
				key = /* @__PURE__ */ toRaw(key);
				hadKey = has.call(target, key);
			} else checkIdentityKeys(target, has, key);
			const oldValue = get ? get.call(target, key) : void 0;
			const result = target.delete(key);
			if (hadKey) trigger(target, "delete", key, void 0, oldValue);
			return result;
		},
		clear() {
			const target = /* @__PURE__ */ toRaw(this);
			const hadItems = target.size !== 0;
			const oldTarget = isMap(target) ? new Map(target) : new Set(target);
			const result = target.clear();
			if (hadItems) trigger(target, "clear", void 0, void 0, oldTarget);
			return result;
		}
	});
	[
		"keys",
		"values",
		"entries",
		Symbol.iterator
	].forEach((method) => {
		instrumentations[method] = createIterableMethod(method, readonly, shallow);
	});
	return instrumentations;
}
function createInstrumentationGetter(isReadonly2, shallow) {
	const instrumentations = createInstrumentations(isReadonly2, shallow);
	return (target, key, receiver) => {
		if (key === "__v_isReactive") return !isReadonly2;
		else if (key === "__v_isReadonly") return isReadonly2;
		else if (key === "__v_raw") return target;
		return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
	};
}
const mutableCollectionHandlers = { get: /* @__PURE__ */ createInstrumentationGetter(false, false) };
const readonlyCollectionHandlers = { get: /* @__PURE__ */ createInstrumentationGetter(true, false) };
const shallowReadonlyCollectionHandlers = { get: /* @__PURE__ */ createInstrumentationGetter(true, true) };
function checkIdentityKeys(target, has, key) {
	const rawKey = /* @__PURE__ */ toRaw(key);
	if (rawKey !== key && has.call(target, rawKey)) {
		const type = toRawType(target);
		warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
	}
}
const reactiveMap = /* @__PURE__ */ new WeakMap();
const shallowReactiveMap = /* @__PURE__ */ new WeakMap();
const readonlyMap = /* @__PURE__ */ new WeakMap();
const shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
function targetTypeMap(rawType) {
	switch (rawType) {
		case "Object":
		case "Array": return 1;
		case "Map":
		case "Set":
		case "WeakMap":
		case "WeakSet": return 2;
		default: return 0;
	}
}
function getTargetType(value) {
	return value["__v_skip"] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
}
/* @__NO_SIDE_EFFECTS__ */
function reactive(target) {
	if (/* @__PURE__ */ isReadonly(target)) return target;
	return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}
/* @__NO_SIDE_EFFECTS__ */
function readonly(target) {
	return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
}
/* @__NO_SIDE_EFFECTS__ */
function shallowReadonly(target) {
	return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap);
}
function createReactiveObject(target, isReadonly2, baseHandlers, collectionHandlers, proxyMap) {
	if (!isObject(target)) {
		warn(`value cannot be made ${isReadonly2 ? "readonly" : "reactive"}: ${String(target)}`);
		return target;
	}
	if (target["__v_raw"] && !(isReadonly2 && target["__v_isReactive"])) return target;
	const targetType = getTargetType(target);
	if (targetType === 0) return target;
	const existingProxy = proxyMap.get(target);
	if (existingProxy) return existingProxy;
	const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
	proxyMap.set(target, proxy);
	return proxy;
}
/* @__NO_SIDE_EFFECTS__ */
function isReactive(value) {
	if (/* @__PURE__ */ isReadonly(value)) return /* @__PURE__ */ isReactive(value["__v_raw"]);
	return !!(value && value["__v_isReactive"]);
}
/* @__NO_SIDE_EFFECTS__ */
function isReadonly(value) {
	return !!(value && value["__v_isReadonly"]);
}
/* @__NO_SIDE_EFFECTS__ */
function isShallow(value) {
	return !!(value && value["__v_isShallow"]);
}
/* @__NO_SIDE_EFFECTS__ */
function isProxy(value) {
	return value ? !!value["__v_raw"] : false;
}
/* @__NO_SIDE_EFFECTS__ */
function toRaw(observed) {
	const raw = observed && observed["__v_raw"];
	return raw ? /* @__PURE__ */ toRaw(raw) : observed;
}
function markRaw(value) {
	if (!hasOwn(value, "__v_skip") && Object.isExtensible(value)) def(value, "__v_skip", true);
	return value;
}
const toReactive = (value) => isObject(value) ? /* @__PURE__ */ reactive(value) : value;
const toReadonly = (value) => isObject(value) ? /* @__PURE__ */ readonly(value) : value;
/* @__NO_SIDE_EFFECTS__ */
function isRef(r) {
	return r ? r["__v_isRef"] === true : false;
}
/* @__NO_SIDE_EFFECTS__ */
function ref(value) {
	return createRef(value, false);
}
function createRef(rawValue, shallow) {
	if (/* @__PURE__ */ isRef(rawValue)) return rawValue;
	return new RefImpl(rawValue, shallow);
}
var RefImpl = class {
	constructor(value, isShallow2) {
		this.dep = new Dep();
		this["__v_isRef"] = true;
		this["__v_isShallow"] = false;
		this._rawValue = isShallow2 ? value : /* @__PURE__ */ toRaw(value);
		this._value = isShallow2 ? value : toReactive(value);
		this["__v_isShallow"] = isShallow2;
	}
	get value() {
		this.dep.track({
			target: this,
			type: "get",
			key: "value"
		});
		return this._value;
	}
	set value(newValue) {
		const oldValue = this._rawValue;
		const useDirectValue = this["__v_isShallow"] || /* @__PURE__ */ isShallow(newValue) || /* @__PURE__ */ isReadonly(newValue);
		newValue = useDirectValue ? newValue : /* @__PURE__ */ toRaw(newValue);
		if (hasChanged(newValue, oldValue)) {
			this._rawValue = newValue;
			this._value = useDirectValue ? newValue : toReactive(newValue);
			this.dep.trigger({
				target: this,
				type: "set",
				key: "value",
				newValue,
				oldValue
			});
		}
	}
};
function unref(ref2) {
	return /* @__PURE__ */ isRef(ref2) ? ref2.value : ref2;
}
const shallowUnwrapHandlers = {
	get: (target, key, receiver) => key === "__v_raw" ? target : unref(Reflect.get(target, key, receiver)),
	set: (target, key, value, receiver) => {
		const oldValue = target[key];
		if (/* @__PURE__ */ isRef(oldValue) && !/* @__PURE__ */ isRef(value)) {
			oldValue.value = value;
			return true;
		} else return Reflect.set(target, key, value, receiver);
	}
};
function proxyRefs(objectWithRefs) {
	return /* @__PURE__ */ isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
var ComputedRefImpl = class {
	constructor(fn, setter, isSSR) {
		this.fn = fn;
		this.setter = setter;
		/**
		* @internal
		*/
		this._value = void 0;
		/**
		* @internal
		*/
		this.dep = new Dep(this);
		/**
		* @internal
		*/
		this.__v_isRef = true;
		/**
		* @internal
		*/
		this.deps = void 0;
		/**
		* @internal
		*/
		this.depsTail = void 0;
		/**
		* @internal
		*/
		this.flags = 16;
		/**
		* @internal
		*/
		this.globalVersion = globalVersion - 1;
		/**
		* @internal
		*/
		this.next = void 0;
		this.effect = this;
		this["__v_isReadonly"] = !setter;
		this.isSSR = isSSR;
	}
	/**
	* @internal
	*/
	notify() {
		this.flags |= 16;
		if (!(this.flags & 8) && activeSub !== this) {
			batch(this, true);
			return true;
		}
	}
	get value() {
		const link = this.dep.track({
			target: this,
			type: "get",
			key: "value"
		});
		refreshComputed(this);
		if (link) link.version = this.dep.version;
		return this._value;
	}
	set value(newValue) {
		if (this.setter) this.setter(newValue);
		else warn("Write operation failed: computed value is readonly");
	}
};
/* @__NO_SIDE_EFFECTS__ */
function computed$1(getterOrOptions, debugOptions, isSSR = false) {
	let getter;
	let setter;
	if (isFunction(getterOrOptions)) getter = getterOrOptions;
	else {
		getter = getterOrOptions.get;
		setter = getterOrOptions.set;
	}
	const cRef = new ComputedRefImpl(getter, setter, isSSR);
	if (debugOptions && !isSSR) {
		cRef.onTrack = debugOptions.onTrack;
		cRef.onTrigger = debugOptions.onTrigger;
	}
	return cRef;
}
const INITIAL_WATCHER_VALUE = {};
const cleanupMap = /* @__PURE__ */ new WeakMap();
let activeWatcher = void 0;
function onWatcherCleanup(cleanupFn, failSilently = false, owner = activeWatcher) {
	if (owner) {
		let cleanups = cleanupMap.get(owner);
		if (!cleanups) cleanupMap.set(owner, cleanups = []);
		cleanups.push(cleanupFn);
	} else if (!failSilently) warn(`onWatcherCleanup() was called when there was no active watcher to associate with.`);
}
function watch(source, cb, options = EMPTY_OBJ) {
	const { immediate, deep, once, scheduler, augmentJob, call } = options;
	const warnInvalidSource = (s) => {
		(options.onWarn || warn)(`Invalid watch source: `, s, `A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types.`);
	};
	const reactiveGetter = (source2) => {
		if (deep) return source2;
		if (/* @__PURE__ */ isShallow(source2) || deep === false || deep === 0) return traverse(source2, 1);
		return traverse(source2);
	};
	let effect;
	let getter;
	let cleanup;
	let boundCleanup;
	let forceTrigger = false;
	let isMultiSource = false;
	if (/* @__PURE__ */ isRef(source)) {
		getter = () => source.value;
		forceTrigger = /* @__PURE__ */ isShallow(source);
	} else if (/* @__PURE__ */ isReactive(source)) {
		getter = () => reactiveGetter(source);
		forceTrigger = true;
	} else if (isArray(source)) {
		isMultiSource = true;
		forceTrigger = source.some((s) => /* @__PURE__ */ isReactive(s) || /* @__PURE__ */ isShallow(s));
		getter = () => source.map((s) => {
			if (/* @__PURE__ */ isRef(s)) return s.value;
			else if (/* @__PURE__ */ isReactive(s)) return reactiveGetter(s);
			else if (isFunction(s)) return call ? call(s, 2) : s();
			else warnInvalidSource(s);
		});
	} else if (isFunction(source)) if (cb) getter = call ? () => call(source, 2) : source;
	else getter = () => {
		if (cleanup) {
			pauseTracking();
			try {
				cleanup();
			} finally {
				resetTracking();
			}
		}
		const currentEffect = activeWatcher;
		activeWatcher = effect;
		try {
			return call ? call(source, 3, [boundCleanup]) : source(boundCleanup);
		} finally {
			activeWatcher = currentEffect;
		}
	};
	else {
		getter = NOOP;
		warnInvalidSource(source);
	}
	if (cb && deep) {
		const baseGetter = getter;
		const depth = deep === true ? Infinity : deep;
		getter = () => traverse(baseGetter(), depth);
	}
	const scope = getCurrentScope();
	const watchHandle = () => {
		effect.stop();
		if (scope && scope.active) remove(scope.effects, effect);
	};
	if (once && cb) {
		const _cb = cb;
		cb = (...args) => {
			_cb(...args);
			watchHandle();
		};
	}
	let oldValue = isMultiSource ? new Array(source.length).fill(INITIAL_WATCHER_VALUE) : INITIAL_WATCHER_VALUE;
	const job = (immediateFirstRun) => {
		if (!(effect.flags & 1) || !effect.dirty && !immediateFirstRun) return;
		if (cb) {
			const newValue = effect.run();
			if (deep || forceTrigger || (isMultiSource ? newValue.some((v, i) => hasChanged(v, oldValue[i])) : hasChanged(newValue, oldValue))) {
				if (cleanup) cleanup();
				const currentWatcher = activeWatcher;
				activeWatcher = effect;
				try {
					const args = [
						newValue,
						oldValue === INITIAL_WATCHER_VALUE ? void 0 : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE ? [] : oldValue,
						boundCleanup
					];
					oldValue = newValue;
					call ? call(cb, 3, args) : cb(...args);
				} finally {
					activeWatcher = currentWatcher;
				}
			}
		} else effect.run();
	};
	if (augmentJob) augmentJob(job);
	effect = new ReactiveEffect(getter);
	effect.scheduler = scheduler ? () => scheduler(job, false) : job;
	boundCleanup = (fn) => onWatcherCleanup(fn, false, effect);
	cleanup = effect.onStop = () => {
		const cleanups = cleanupMap.get(effect);
		if (cleanups) {
			if (call) call(cleanups, 4);
			else for (const cleanup2 of cleanups) cleanup2();
			cleanupMap.delete(effect);
		}
	};
	effect.onTrack = options.onTrack;
	effect.onTrigger = options.onTrigger;
	if (cb) if (immediate) job(true);
	else oldValue = effect.run();
	else if (scheduler) scheduler(job.bind(null, true), true);
	else effect.run();
	watchHandle.pause = effect.pause.bind(effect);
	watchHandle.resume = effect.resume.bind(effect);
	watchHandle.stop = watchHandle;
	return watchHandle;
}
function traverse(value, depth = Infinity, seen) {
	if (depth <= 0 || !isObject(value) || value["__v_skip"]) return value;
	seen = seen || /* @__PURE__ */ new Map();
	if ((seen.get(value) || 0) >= depth) return value;
	seen.set(value, depth);
	depth--;
	if (/* @__PURE__ */ isRef(value)) traverse(value.value, depth, seen);
	else if (isArray(value)) for (let i = 0; i < value.length; i++) traverse(value[i], depth, seen);
	else if (isSet(value) || isMap(value)) value.forEach((v) => {
		traverse(v, depth, seen);
	});
	else if (isPlainObject(value)) {
		for (const key in value) traverse(value[key], depth, seen);
		for (const key of Object.getOwnPropertySymbols(value)) if (Object.prototype.propertyIsEnumerable.call(value, key)) traverse(value[key], depth, seen);
	}
	return value;
}
//#endregion
//#region node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
/**
* @vue/runtime-core v3.5.34
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
const stack = [];
function pushWarningContext(vnode) {
	stack.push(vnode);
}
function popWarningContext() {
	stack.pop();
}
let isWarning = false;
function warn$1(msg, ...args) {
	if (isWarning) return;
	isWarning = true;
	pauseTracking();
	const instance = stack.length ? stack[stack.length - 1].component : null;
	const appWarnHandler = instance && instance.appContext.config.warnHandler;
	const trace = getComponentTrace();
	if (appWarnHandler) callWithErrorHandling(appWarnHandler, instance, 11, [
		msg + args.map((a) => {
			var _a, _b;
			return (_b = (_a = a.toString) == null ? void 0 : _a.call(a)) != null ? _b : JSON.stringify(a);
		}).join(""),
		instance && instance.proxy,
		trace.map(({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`).join("\n"),
		trace
	]);
	else {
		const warnArgs = [`[Vue warn]: ${msg}`, ...args];
		if (trace.length && true) warnArgs.push(`
`, ...formatTrace(trace));
		console.warn(...warnArgs);
	}
	resetTracking();
	isWarning = false;
}
function getComponentTrace() {
	let currentVNode = stack[stack.length - 1];
	if (!currentVNode) return [];
	const normalizedStack = [];
	while (currentVNode) {
		const last = normalizedStack[0];
		if (last && last.vnode === currentVNode) last.recurseCount++;
		else normalizedStack.push({
			vnode: currentVNode,
			recurseCount: 0
		});
		const parentInstance = currentVNode.component && currentVNode.component.parent;
		currentVNode = parentInstance && parentInstance.vnode;
	}
	return normalizedStack;
}
function formatTrace(trace) {
	const logs = [];
	trace.forEach((entry, i) => {
		logs.push(...i === 0 ? [] : [`
`], ...formatTraceEntry(entry));
	});
	return logs;
}
function formatTraceEntry({ vnode, recurseCount }) {
	const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
	const isRoot = vnode.component ? vnode.component.parent == null : false;
	const open = ` at <${formatComponentName(vnode.component, vnode.type, isRoot)}`;
	const close = `>` + postfix;
	return vnode.props ? [
		open,
		...formatProps(vnode.props),
		close
	] : [open + close];
}
function formatProps(props) {
	const res = [];
	const keys = Object.keys(props);
	keys.slice(0, 3).forEach((key) => {
		res.push(...formatProp(key, props[key]));
	});
	if (keys.length > 3) res.push(` ...`);
	return res;
}
function formatProp(key, value, raw) {
	if (isString(value)) {
		value = JSON.stringify(value);
		return raw ? value : [`${key}=${value}`];
	} else if (typeof value === "number" || typeof value === "boolean" || value == null) return raw ? value : [`${key}=${value}`];
	else if (/* @__PURE__ */ isRef(value)) {
		value = formatProp(key, /* @__PURE__ */ toRaw(value.value), true);
		return raw ? value : [
			`${key}=Ref<`,
			value,
			`>`
		];
	} else if (isFunction(value)) return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
	else {
		value = /* @__PURE__ */ toRaw(value);
		return raw ? value : [`${key}=`, value];
	}
}
const ErrorTypeStrings$1 = {
	["sp"]: "serverPrefetch hook",
	["bc"]: "beforeCreate hook",
	["c"]: "created hook",
	["bm"]: "beforeMount hook",
	["m"]: "mounted hook",
	["bu"]: "beforeUpdate hook",
	["u"]: "updated",
	["bum"]: "beforeUnmount hook",
	["um"]: "unmounted hook",
	["a"]: "activated hook",
	["da"]: "deactivated hook",
	["ec"]: "errorCaptured hook",
	["rtc"]: "renderTracked hook",
	["rtg"]: "renderTriggered hook",
	[0]: "setup function",
	[1]: "render function",
	[2]: "watcher getter",
	[3]: "watcher callback",
	[4]: "watcher cleanup function",
	[5]: "native event handler",
	[6]: "component event handler",
	[7]: "vnode hook",
	[8]: "directive hook",
	[9]: "transition hook",
	[10]: "app errorHandler",
	[11]: "app warnHandler",
	[12]: "ref function",
	[13]: "async component loader",
	[14]: "scheduler flush",
	[15]: "component update",
	[16]: "app unmount cleanup function"
};
function callWithErrorHandling(fn, instance, type, args) {
	try {
		return args ? fn(...args) : fn();
	} catch (err) {
		handleError(err, instance, type);
	}
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
	if (isFunction(fn)) {
		const res = callWithErrorHandling(fn, instance, type, args);
		if (res && isPromise(res)) res.catch((err) => {
			handleError(err, instance, type);
		});
		return res;
	}
	if (isArray(fn)) {
		const values = [];
		for (let i = 0; i < fn.length; i++) values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
		return values;
	} else warn$1(`Invalid value type passed to callWithAsyncErrorHandling(): ${typeof fn}`);
}
function handleError(err, instance, type, throwInDev = true) {
	const contextVNode = instance ? instance.vnode : null;
	const { errorHandler, throwUnhandledErrorInProduction } = instance && instance.appContext.config || EMPTY_OBJ;
	if (instance) {
		let cur = instance.parent;
		const exposedInstance = instance.proxy;
		const errorInfo = ErrorTypeStrings$1[type];
		while (cur) {
			const errorCapturedHooks = cur.ec;
			if (errorCapturedHooks) {
				for (let i = 0; i < errorCapturedHooks.length; i++) if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) return;
			}
			cur = cur.parent;
		}
		if (errorHandler) {
			pauseTracking();
			callWithErrorHandling(errorHandler, null, 10, [
				err,
				exposedInstance,
				errorInfo
			]);
			resetTracking();
			return;
		}
	}
	logError(err, type, contextVNode, throwInDev, throwUnhandledErrorInProduction);
}
function logError(err, type, contextVNode, throwInDev = true, throwInProd = false) {
	{
		const info = ErrorTypeStrings$1[type];
		if (contextVNode) pushWarningContext(contextVNode);
		warn$1(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
		if (contextVNode) popWarningContext();
		if (throwInDev) throw err;
		else console.error(err);
	}
}
const queue = [];
let flushIndex = -1;
const pendingPostFlushCbs = [];
let activePostFlushCbs = null;
let postFlushIndex = 0;
const resolvedPromise = /* @__PURE__ */ Promise.resolve();
let currentFlushPromise = null;
const RECURSION_LIMIT = 100;
function nextTick(fn) {
	const p = currentFlushPromise || resolvedPromise;
	return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
function findInsertionIndex(id) {
	let start = flushIndex + 1;
	let end = queue.length;
	while (start < end) {
		const middle = start + end >>> 1;
		const middleJob = queue[middle];
		const middleJobId = getId(middleJob);
		if (middleJobId < id || middleJobId === id && middleJob.flags & 2) start = middle + 1;
		else end = middle;
	}
	return start;
}
function queueJob(job) {
	if (!(job.flags & 1)) {
		const jobId = getId(job);
		const lastJob = queue[queue.length - 1];
		if (!lastJob || !(job.flags & 2) && jobId >= getId(lastJob)) queue.push(job);
		else queue.splice(findInsertionIndex(jobId), 0, job);
		job.flags |= 1;
		queueFlush();
	}
}
function queueFlush() {
	if (!currentFlushPromise) currentFlushPromise = resolvedPromise.then(flushJobs);
}
function queuePostFlushCb(cb) {
	if (!isArray(cb)) {
		if (activePostFlushCbs && cb.id === -1) activePostFlushCbs.splice(postFlushIndex + 1, 0, cb);
		else if (!(cb.flags & 1)) {
			pendingPostFlushCbs.push(cb);
			cb.flags |= 1;
		}
	} else pendingPostFlushCbs.push(...cb);
	queueFlush();
}
function flushPostFlushCbs(seen) {
	if (pendingPostFlushCbs.length) {
		const deduped = [...new Set(pendingPostFlushCbs)].sort((a, b) => getId(a) - getId(b));
		pendingPostFlushCbs.length = 0;
		if (activePostFlushCbs) {
			activePostFlushCbs.push(...deduped);
			return;
		}
		activePostFlushCbs = deduped;
		seen = seen || /* @__PURE__ */ new Map();
		for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
			const cb = activePostFlushCbs[postFlushIndex];
			if (checkRecursiveUpdates(seen, cb)) continue;
			if (cb.flags & 4) cb.flags &= -2;
			if (!(cb.flags & 8)) cb();
			cb.flags &= -2;
		}
		activePostFlushCbs = null;
		postFlushIndex = 0;
	}
}
const getId = (job) => job.id == null ? job.flags & 2 ? -1 : Infinity : job.id;
function flushJobs(seen) {
	seen = seen || /* @__PURE__ */ new Map();
	const check = (job) => checkRecursiveUpdates(seen, job);
	try {
		for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
			const job = queue[flushIndex];
			if (job && !(job.flags & 8)) {
				if (check(job)) continue;
				if (job.flags & 4) job.flags &= -2;
				callWithErrorHandling(job, job.i, job.i ? 15 : 14);
				if (!(job.flags & 4)) job.flags &= -2;
			}
		}
	} finally {
		for (; flushIndex < queue.length; flushIndex++) {
			const job = queue[flushIndex];
			if (job) job.flags &= -2;
		}
		flushIndex = -1;
		queue.length = 0;
		flushPostFlushCbs(seen);
		currentFlushPromise = null;
		if (queue.length || pendingPostFlushCbs.length) flushJobs(seen);
	}
}
function checkRecursiveUpdates(seen, fn) {
	const count = seen.get(fn) || 0;
	if (count > RECURSION_LIMIT) {
		const instance = fn.i;
		const componentName = instance && getComponentName(instance.type);
		handleError(`Maximum recursive updates exceeded${componentName ? ` in component <${componentName}>` : ``}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`, null, 10);
		return true;
	}
	seen.set(fn, count + 1);
	return false;
}
const hmrDirtyComponents = /* @__PURE__ */ new Map();
getGlobalThis().__VUE_HMR_RUNTIME__ = {
	createRecord: tryWrap(createRecord),
	rerender: tryWrap(rerender),
	reload: tryWrap(reload)
};
const map = /* @__PURE__ */ new Map();
function createRecord(id, initialDef) {
	if (map.has(id)) return false;
	map.set(id, {
		initialDef: normalizeClassComponent(initialDef),
		instances: /* @__PURE__ */ new Set()
	});
	return true;
}
function normalizeClassComponent(component) {
	return isClassComponent(component) ? component.__vccOpts : component;
}
function rerender(id, newRender) {
	const record = map.get(id);
	if (!record) return;
	record.initialDef.render = newRender;
	[...record.instances].forEach((instance) => {
		if (newRender) {
			instance.render = newRender;
			normalizeClassComponent(instance.type).render = newRender;
		}
		instance.renderCache = [];
		if (!(instance.job.flags & 8)) instance.update();
	});
}
function reload(id, newComp) {
	const record = map.get(id);
	if (!record) return;
	newComp = normalizeClassComponent(newComp);
	updateComponentDef(record.initialDef, newComp);
	const instances = [...record.instances];
	for (let i = 0; i < instances.length; i++) {
		const instance = instances[i];
		const oldComp = normalizeClassComponent(instance.type);
		let dirtyInstances = hmrDirtyComponents.get(oldComp);
		if (!dirtyInstances) {
			if (oldComp !== record.initialDef) updateComponentDef(oldComp, newComp);
			hmrDirtyComponents.set(oldComp, dirtyInstances = /* @__PURE__ */ new Set());
		}
		dirtyInstances.add(instance);
		instance.appContext.propsCache.delete(instance.type);
		instance.appContext.emitsCache.delete(instance.type);
		instance.appContext.optionsCache.delete(instance.type);
		if (instance.ceReload) {
			dirtyInstances.add(instance);
			instance.ceReload(newComp.styles);
			dirtyInstances.delete(instance);
		} else if (instance.parent) queueJob(() => {
			if (!(instance.job.flags & 8)) {
				instance.parent.update();
				dirtyInstances.delete(instance);
			}
		});
		else if (instance.appContext.reload) instance.appContext.reload();
		else if (typeof window !== "undefined") window.location.reload();
		else console.warn("[HMR] Root or manually mounted instance modified. Full reload required.");
		if (instance.root.ce && instance !== instance.root) instance.root.ce._removeChildStyle(oldComp);
	}
	queuePostFlushCb(() => {
		hmrDirtyComponents.clear();
	});
}
function updateComponentDef(oldComp, newComp) {
	extend(oldComp, newComp);
	for (const key in oldComp) if (key !== "__file" && !(key in newComp)) delete oldComp[key];
}
function tryWrap(fn) {
	return (id, arg) => {
		try {
			return fn(id, arg);
		} catch (e) {
			console.error(e);
			console.warn(`[HMR] Something went wrong during Vue component hot-reload. Full reload required.`);
		}
	};
}
let currentRenderingInstance = null;
function inject(key, defaultValue, treatDefaultAsFactory = false) {
	const instance = getCurrentInstance();
	if (instance || currentApp) {
		let provides = currentApp ? currentApp._context.provides : instance ? instance.parent == null || instance.ce ? instance.vnode.appContext && instance.vnode.appContext.provides : instance.parent.provides : void 0;
		if (provides && key in provides) return provides[key];
		else if (arguments.length > 1) return treatDefaultAsFactory && isFunction(defaultValue) ? defaultValue.call(instance && instance.proxy) : defaultValue;
		else warn$1(`injection "${String(key)}" not found.`);
	} else warn$1(`inject() can only be used inside setup() or functional components.`);
}
const ssrContextKey = /* @__PURE__ */ Symbol.for("v-scx");
const useSSRContext = () => {
	{
		const ctx = inject(ssrContextKey);
		if (!ctx) warn$1(`Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build.`);
		return ctx;
	}
};
function doWatch(source, cb, options = EMPTY_OBJ) {
	const { immediate, deep, flush, once } = options;
	if (!cb) {
		if (immediate !== void 0) warn$1(`watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.`);
		if (deep !== void 0) warn$1(`watch() "deep" option is only respected when using the watch(source, callback, options?) signature.`);
		if (once !== void 0) warn$1(`watch() "once" option is only respected when using the watch(source, callback, options?) signature.`);
	}
	const baseWatchOptions = extend({}, options);
	baseWatchOptions.onWarn = warn$1;
	const runsImmediately = cb && immediate || !cb && flush !== "post";
	let ssrCleanup;
	if (isInSSRComponentSetup) {
		if (flush === "sync") {
			const ctx = useSSRContext();
			ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = []);
		} else if (!runsImmediately) {
			const watchStopHandle = () => {};
			watchStopHandle.stop = NOOP;
			watchStopHandle.resume = NOOP;
			watchStopHandle.pause = NOOP;
			return watchStopHandle;
		}
	}
	const instance = currentInstance;
	baseWatchOptions.call = (fn, type, args) => callWithAsyncErrorHandling(fn, instance, type, args);
	let isPre = false;
	if (flush === "post") baseWatchOptions.scheduler = (job) => {
		queuePostRenderEffect(job, instance && instance.suspense);
	};
	else if (flush !== "sync") {
		isPre = true;
		baseWatchOptions.scheduler = (job, isFirstRun) => {
			if (isFirstRun) job();
			else queueJob(job);
		};
	}
	baseWatchOptions.augmentJob = (job) => {
		if (cb) job.flags |= 4;
		if (isPre) {
			job.flags |= 2;
			if (instance) {
				job.id = instance.uid;
				job.i = instance;
			}
		}
	};
	const watchHandle = watch(source, cb, baseWatchOptions);
	if (isInSSRComponentSetup) {
		if (ssrCleanup) ssrCleanup.push(watchHandle);
		else if (runsImmediately) watchHandle();
	}
	return watchHandle;
}
function instanceWatch(source, value, options) {
	const publicThis = this.proxy;
	const getter = isString(source) ? source.includes(".") ? createPathGetter(publicThis, source) : () => publicThis[source] : source.bind(publicThis, publicThis);
	let cb;
	if (isFunction(value)) cb = value;
	else {
		cb = value.handler;
		options = value;
	}
	const reset = setCurrentInstance(this);
	const res = doWatch(getter, cb.bind(publicThis), options);
	reset();
	return res;
}
function createPathGetter(ctx, path) {
	const segments = path.split(".");
	return () => {
		let cur = ctx;
		for (let i = 0; i < segments.length && cur; i++) cur = cur[segments[i]];
		return cur;
	};
}
getGlobalThis().requestIdleCallback;
getGlobalThis().cancelIdleCallback;
const getPublicInstance = (i) => {
	if (!i) return null;
	if (isStatefulComponent(i)) return getComponentPublicInstance(i);
	return getPublicInstance(i.parent);
};
const publicPropertiesMap = /* @__PURE__ */ extend(/* @__PURE__ */ Object.create(null), {
	$: (i) => i,
	$el: (i) => i.vnode.el,
	$data: (i) => i.data,
	$props: (i) => /* @__PURE__ */ shallowReadonly(i.props),
	$attrs: (i) => /* @__PURE__ */ shallowReadonly(i.attrs),
	$slots: (i) => /* @__PURE__ */ shallowReadonly(i.slots),
	$refs: (i) => /* @__PURE__ */ shallowReadonly(i.refs),
	$parent: (i) => getPublicInstance(i.parent),
	$root: (i) => getPublicInstance(i.root),
	$host: (i) => i.ce,
	$emit: (i) => i.emit,
	$options: (i) => __VUE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type,
	$forceUpdate: (i) => i.f || (i.f = () => {
		queueJob(i.update);
	}),
	$nextTick: (i) => i.n || (i.n = nextTick.bind(i.proxy)),
	$watch: (i) => __VUE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP
});
const hasSetupBinding = (state, key) => state !== EMPTY_OBJ && !state.__isScriptSetup && hasOwn(state, key);
const PublicInstanceProxyHandlers = {
	get({ _: instance }, key) {
		if (key === "__v_skip") return true;
		const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
		if (key === "__isVue") return true;
		if (key[0] !== "$") {
			const n = accessCache[key];
			if (n !== void 0) switch (n) {
				case 1: return setupState[key];
				case 2: return data[key];
				case 4: return ctx[key];
				case 3: return props[key];
			}
			else if (hasSetupBinding(setupState, key)) {
				accessCache[key] = 1;
				return setupState[key];
			} else if (__VUE_OPTIONS_API__ && data !== EMPTY_OBJ && hasOwn(data, key)) {
				accessCache[key] = 2;
				return data[key];
			} else if (hasOwn(props, key)) {
				accessCache[key] = 3;
				return props[key];
			} else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
				accessCache[key] = 4;
				return ctx[key];
			} else if (!__VUE_OPTIONS_API__ || shouldCacheAccess) accessCache[key] = 0;
		}
		const publicGetter = publicPropertiesMap[key];
		let cssModule, globalProperties;
		if (publicGetter) {
			if (key === "$attrs") track(instance.attrs, "get", "");
			else if (key === "$slots") track(instance, "get", key);
			return publicGetter(instance);
		} else if ((cssModule = type.__cssModules) && (cssModule = cssModule[key])) return cssModule;
		else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
			accessCache[key] = 4;
			return ctx[key];
		} else if (globalProperties = appContext.config.globalProperties, hasOwn(globalProperties, key)) return globalProperties[key];
	},
	set({ _: instance }, key, value) {
		const { data, setupState, ctx } = instance;
		if (hasSetupBinding(setupState, key)) {
			setupState[key] = value;
			return true;
		} else if (setupState.__isScriptSetup && hasOwn(setupState, key)) {
			warn$1(`Cannot mutate <script setup> binding "${key}" from Options API.`);
			return false;
		} else if (__VUE_OPTIONS_API__ && data !== EMPTY_OBJ && hasOwn(data, key)) {
			data[key] = value;
			return true;
		} else if (hasOwn(instance.props, key)) {
			warn$1(`Attempting to mutate prop "${key}". Props are readonly.`);
			return false;
		}
		if (key[0] === "$" && key.slice(1) in instance) {
			warn$1(`Attempting to mutate public property "${key}". Properties starting with $ are reserved and readonly.`);
			return false;
		} else if (key in instance.appContext.config.globalProperties) Object.defineProperty(ctx, key, {
			enumerable: true,
			configurable: true,
			value
		});
		else ctx[key] = value;
		return true;
	},
	has({ _: { data, setupState, accessCache, ctx, appContext, props, type } }, key) {
		let cssModules;
		return !!(accessCache[key] || __VUE_OPTIONS_API__ && data !== EMPTY_OBJ && key[0] !== "$" && hasOwn(data, key) || hasSetupBinding(setupState, key) || hasOwn(props, key) || hasOwn(ctx, key) || hasOwn(publicPropertiesMap, key) || hasOwn(appContext.config.globalProperties, key) || (cssModules = type.__cssModules) && cssModules[key]);
	},
	defineProperty(target, key, descriptor) {
		if (descriptor.get != null) target._.accessCache[key] = 0;
		else if (hasOwn(descriptor, "value")) this.set(target, key, descriptor.value, null);
		return Reflect.defineProperty(target, key, descriptor);
	}
};
PublicInstanceProxyHandlers.ownKeys = (target) => {
	warn$1(`Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead.`);
	return Reflect.ownKeys(target);
};
function normalizePropsOrEmits(props) {
	return isArray(props) ? props.reduce((normalized, p) => (normalized[p] = null, normalized), {}) : props;
}
let shouldCacheAccess = true;
function resolveMergedOptions(instance) {
	const base = instance.type;
	const { mixins, extends: extendsOptions } = base;
	const { mixins: globalMixins, optionsCache: cache, config: { optionMergeStrategies } } = instance.appContext;
	const cached = cache.get(base);
	let resolved;
	if (cached) resolved = cached;
	else if (!globalMixins.length && !mixins && !extendsOptions) resolved = base;
	else {
		resolved = {};
		if (globalMixins.length) globalMixins.forEach((m) => mergeOptions(resolved, m, optionMergeStrategies, true));
		mergeOptions(resolved, base, optionMergeStrategies);
	}
	if (isObject(base)) cache.set(base, resolved);
	return resolved;
}
function mergeOptions(to, from, strats, asMixin = false) {
	const { mixins, extends: extendsOptions } = from;
	if (extendsOptions) mergeOptions(to, extendsOptions, strats, true);
	if (mixins) mixins.forEach((m) => mergeOptions(to, m, strats, true));
	for (const key in from) if (asMixin && key === "expose") warn$1(`"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.`);
	else {
		const strat = internalOptionMergeStrats[key] || strats && strats[key];
		to[key] = strat ? strat(to[key], from[key]) : from[key];
	}
	return to;
}
const internalOptionMergeStrats = {
	data: mergeDataFn,
	props: mergeEmitsOrPropsOptions,
	emits: mergeEmitsOrPropsOptions,
	methods: mergeObjectOptions,
	computed: mergeObjectOptions,
	beforeCreate: mergeAsArray,
	created: mergeAsArray,
	beforeMount: mergeAsArray,
	mounted: mergeAsArray,
	beforeUpdate: mergeAsArray,
	updated: mergeAsArray,
	beforeDestroy: mergeAsArray,
	beforeUnmount: mergeAsArray,
	destroyed: mergeAsArray,
	unmounted: mergeAsArray,
	activated: mergeAsArray,
	deactivated: mergeAsArray,
	errorCaptured: mergeAsArray,
	serverPrefetch: mergeAsArray,
	components: mergeObjectOptions,
	directives: mergeObjectOptions,
	watch: mergeWatchOptions,
	provide: mergeDataFn,
	inject: mergeInject
};
function mergeDataFn(to, from) {
	if (!from) return to;
	if (!to) return from;
	return function mergedDataFn() {
		return extend(isFunction(to) ? to.call(this, this) : to, isFunction(from) ? from.call(this, this) : from);
	};
}
function mergeInject(to, from) {
	return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
}
function normalizeInject(raw) {
	if (isArray(raw)) {
		const res = {};
		for (let i = 0; i < raw.length; i++) res[raw[i]] = raw[i];
		return res;
	}
	return raw;
}
function mergeAsArray(to, from) {
	return to ? [...new Set([].concat(to, from))] : from;
}
function mergeObjectOptions(to, from) {
	return to ? extend(/* @__PURE__ */ Object.create(null), to, from) : from;
}
function mergeEmitsOrPropsOptions(to, from) {
	if (to) {
		if (isArray(to) && isArray(from)) return [.../* @__PURE__ */ new Set([...to, ...from])];
		return extend(/* @__PURE__ */ Object.create(null), normalizePropsOrEmits(to), normalizePropsOrEmits(from != null ? from : {}));
	} else return from;
}
function mergeWatchOptions(to, from) {
	if (!to) return from;
	if (!from) return to;
	const merged = extend(/* @__PURE__ */ Object.create(null), to);
	for (const key in from) merged[key] = mergeAsArray(to[key], from[key]);
	return merged;
}
let currentApp = null;
const queuePostRenderEffect = queueEffectWithSuspense;
function queueEffectWithSuspense(fn, suspense) {
	if (suspense && suspense.pendingBranch) if (isArray(fn)) suspense.effects.push(...fn);
	else suspense.effects.push(fn);
	else queuePostFlushCb(fn);
}
let currentInstance = null;
const getCurrentInstance = () => currentInstance || currentRenderingInstance;
let internalSetCurrentInstance;
{
	const g = getGlobalThis();
	const registerGlobalSetter = (key, setter) => {
		let setters;
		if (!(setters = g[key])) setters = g[key] = [];
		setters.push(setter);
		return (v) => {
			if (setters.length > 1) setters.forEach((set) => set(v));
			else setters[0](v);
		};
	};
	internalSetCurrentInstance = registerGlobalSetter(`__VUE_INSTANCE_SETTERS__`, (v) => currentInstance = v);
	registerGlobalSetter(`__VUE_SSR_SETTERS__`, (v) => isInSSRComponentSetup = v);
}
const setCurrentInstance = (instance) => {
	const prev = currentInstance;
	internalSetCurrentInstance(instance);
	instance.scope.on();
	return () => {
		instance.scope.off();
		internalSetCurrentInstance(prev);
	};
};
function isStatefulComponent(instance) {
	return instance.vnode.shapeFlag & 4;
}
let isInSSRComponentSetup = false;
function getComponentPublicInstance(instance) {
	if (instance.exposed) return instance.exposeProxy || (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
		get(target, key) {
			if (key in target) return target[key];
			else if (key in publicPropertiesMap) return publicPropertiesMap[key](instance);
		},
		has(target, key) {
			return key in target || key in publicPropertiesMap;
		}
	}));
	else return instance.proxy;
}
const classifyRE = /(?:^|[-_])\w/g;
const classify = (str) => str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, "");
function getComponentName(Component, includeInferred = true) {
	return isFunction(Component) ? Component.displayName || Component.name : Component.name || includeInferred && Component.__name;
}
function formatComponentName(instance, Component, isRoot = false) {
	let name = getComponentName(Component);
	if (!name && Component.__file) {
		const match = Component.__file.match(/([^/\\]+)\.\w+$/);
		if (match) name = match[1];
	}
	if (!name && instance) {
		const inferFromRegistry = (registry) => {
			for (const key in registry) if (registry[key] === Component) return key;
		};
		name = inferFromRegistry(instance.components) || instance.parent && inferFromRegistry(instance.parent.type.components) || inferFromRegistry(instance.appContext.components);
	}
	return name ? classify(name) : isRoot ? `App` : `Anonymous`;
}
function isClassComponent(value) {
	return isFunction(value) && "__vccOpts" in value;
}
const computed = (getterOrOptions, debugOptions) => {
	const c = /* @__PURE__ */ computed$1(getterOrOptions, debugOptions, isInSSRComponentSetup);
	{
		const i = getCurrentInstance();
		if (i && i.appContext.config.warnRecursiveComputed) c._warnRecursive = true;
	}
	return c;
};
function initCustomFormatter() {
	if (typeof window === "undefined") return;
	const vueStyle = { style: "color:#3ba776" };
	const numberStyle = { style: "color:#1677ff" };
	const stringStyle = { style: "color:#f5222d" };
	const keywordStyle = { style: "color:#eb2f96" };
	const formatter = {
		__vue_custom_formatter: true,
		header(obj) {
			if (!isObject(obj)) return null;
			if (obj.__isVue) return [
				"div",
				vueStyle,
				`VueInstance`
			];
			else if (/* @__PURE__ */ isRef(obj)) {
				pauseTracking();
				const value = obj.value;
				resetTracking();
				return [
					"div",
					{},
					[
						"span",
						vueStyle,
						genRefFlag(obj)
					],
					"<",
					formatValue(value),
					`>`
				];
			} else if (/* @__PURE__ */ isReactive(obj)) return [
				"div",
				{},
				[
					"span",
					vueStyle,
					/* @__PURE__ */ isShallow(obj) ? "ShallowReactive" : "Reactive"
				],
				"<",
				formatValue(obj),
				`>${/* @__PURE__ */ isReadonly(obj) ? ` (readonly)` : ``}`
			];
			else if (/* @__PURE__ */ isReadonly(obj)) return [
				"div",
				{},
				[
					"span",
					vueStyle,
					/* @__PURE__ */ isShallow(obj) ? "ShallowReadonly" : "Readonly"
				],
				"<",
				formatValue(obj),
				">"
			];
			return null;
		},
		hasBody(obj) {
			return obj && obj.__isVue;
		},
		body(obj) {
			if (obj && obj.__isVue) return [
				"div",
				{},
				...formatInstance(obj.$)
			];
		}
	};
	function formatInstance(instance) {
		const blocks = [];
		if (instance.type.props && instance.props) blocks.push(createInstanceBlock("props", /* @__PURE__ */ toRaw(instance.props)));
		if (instance.setupState !== EMPTY_OBJ) blocks.push(createInstanceBlock("setup", instance.setupState));
		if (instance.data !== EMPTY_OBJ) blocks.push(createInstanceBlock("data", /* @__PURE__ */ toRaw(instance.data)));
		const computed = extractKeys(instance, "computed");
		if (computed) blocks.push(createInstanceBlock("computed", computed));
		const injected = extractKeys(instance, "inject");
		if (injected) blocks.push(createInstanceBlock("injected", injected));
		blocks.push([
			"div",
			{},
			[
				"span",
				{ style: keywordStyle.style + ";opacity:0.66" },
				"$ (internal): "
			],
			["object", { object: instance }]
		]);
		return blocks;
	}
	function createInstanceBlock(type, target) {
		target = extend({}, target);
		if (!Object.keys(target).length) return ["span", {}];
		return [
			"div",
			{ style: "line-height:1.25em;margin-bottom:0.6em" },
			[
				"div",
				{ style: "color:#476582" },
				type
			],
			[
				"div",
				{ style: "padding-left:1.25em" },
				...Object.keys(target).map((key) => {
					return [
						"div",
						{},
						[
							"span",
							keywordStyle,
							key + ": "
						],
						formatValue(target[key], false)
					];
				})
			]
		];
	}
	function formatValue(v, asRaw = true) {
		if (typeof v === "number") return [
			"span",
			numberStyle,
			v
		];
		else if (typeof v === "string") return [
			"span",
			stringStyle,
			JSON.stringify(v)
		];
		else if (typeof v === "boolean") return [
			"span",
			keywordStyle,
			v
		];
		else if (isObject(v)) return ["object", { object: asRaw ? /* @__PURE__ */ toRaw(v) : v }];
		else return [
			"span",
			stringStyle,
			String(v)
		];
	}
	function extractKeys(instance, type) {
		const Comp = instance.type;
		if (isFunction(Comp)) return;
		const extracted = {};
		for (const key in instance.ctx) if (isKeyOfType(Comp, key, type)) extracted[key] = instance.ctx[key];
		return extracted;
	}
	function isKeyOfType(Comp, key, type) {
		const opts = Comp[type];
		if (isArray(opts) && opts.includes(key) || isObject(opts) && key in opts) return true;
		if (Comp.extends && isKeyOfType(Comp.extends, key, type)) return true;
		if (Comp.mixins && Comp.mixins.some((m) => isKeyOfType(m, key, type))) return true;
	}
	function genRefFlag(v) {
		if (/* @__PURE__ */ isShallow(v)) return `ShallowRef`;
		if (v.effect) return `ComputedRef`;
		return `Ref`;
	}
	if (window.devtoolsFormatters) window.devtoolsFormatters.push(formatter);
	else window.devtoolsFormatters = [formatter];
}
//#endregion
//#region node_modules/vue/dist/vue.runtime.esm-bundler.js
/**
* vue v3.5.34
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
function initDev() {
	initCustomFormatter();
}
initDev();
//#endregion
//#region src/typeDefs.ts
const GetTextSymbol = Symbol("GETTEXT");
//#endregion
//#region src/utilities.ts
function normalizeMsgId(key) {
	return key.replaceAll(/\r?\n/g, "\n");
}
function normalizeTranslations(translations) {
	const newTranslations = {};
	Object.keys(translations).forEach((lang) => {
		const langData = translations[lang];
		const newLangData = {};
		Object.keys(langData).forEach((key) => {
			newLangData[normalizeMsgId(key)] = langData[key];
		});
		newTranslations[lang] = newLangData;
	});
	return newTranslations;
}
const useGettext = () => {
	const gettext = inject(GetTextSymbol, null);
	if (!gettext) throw new Error("Failed to inject gettext. Make sure vue3-gettext is set up properly.");
	return gettext;
};
function assertIsDefined(value) {
	if (value === void 0 || value === null) throw new Error(`${value} is not defined`);
}
//#endregion
//#region src/extract/tokenizer.ts
/** Careful: API is not stable */
function tokenize(mapping, src) {
	const tokens = [];
	let idx = -1;
	let unrecognizedContent = "";
	const keywords = Object.values(mapping).flat();
	const maxKeywordLen = keywords.reduce((prev, curr) => {
		if (curr.length > prev) return curr.length;
		return prev;
	}, 0);
	function advance() {
		idx += 1;
		return src.charAt(idx);
	}
	function addToken(kind, charIndex, value) {
		if (unrecognizedContent.trim()) {
			tokens.push({
				kind: "Unrecognized",
				idx,
				value: unrecognizedContent
			});
			unrecognizedContent = "";
		}
		if (value) {
			tokens.push({
				kind,
				idx: charIndex,
				value
			});
			return;
		}
		tokens.push({
			kind,
			idx: charIndex
		});
	}
	function readString(delimiter) {
		let content = "";
		let prevChar = delimiter;
		let c = advance();
		function advanceChar() {
			prevChar = c;
			c = advance();
		}
		while (true) {
			if (c === "") {
				console.error(`parsing error, string literal is not closed until end of file`);
				break;
			}
			if (prevChar !== "\\") {
				if (c === "\\") {
					advanceChar();
					continue;
				}
				if (c === delimiter) break;
			}
			const backSlashInserted = c === "\\";
			content += c;
			advanceChar();
			if (backSlashInserted) prevChar = "\\\\";
		}
		return content.replace(/\r\n/g, "\n");
	}
	function scanToken() {
		const c = advance();
		switch (c) {
			case "(":
				addToken("ParenLeft", idx);
				break;
			case ",":
				addToken("Comma", idx);
				break;
			case "\"":
			case "'":
			case "`":
				const prevTokenKind = tokens[tokens.length - 1]?.kind;
				if (!unrecognizedContent.trim() && (prevTokenKind === "ParenLeft" || prevTokenKind === "Comma")) {
					addToken("String", idx, readString(c));
					break;
				}
			default:
				if (c.match(/\s\n\r/)) break;
				const possibleKeyword = src.substring(idx, idx + maxKeywordLen);
				const matchedKeyword = keywords.filter((kw) => possibleKeyword.startsWith(kw)).reduce((prev, curr) => {
					if (curr.length > (prev?.length ?? 0)) return curr;
					return prev;
				}, void 0);
				if (matchedKeyword) {
					addToken("Keyword", idx, matchedKeyword);
					idx += matchedKeyword.length - 1;
					break;
				}
				unrecognizedContent += c;
				break;
		}
	}
	while (idx < src.length) scanToken();
	return tokens;
}
//#endregion
//#region src/extract/parser.ts
var import_po = /* @__PURE__ */ __toESM(require_po(), 1);
function parseFunctionCall(mapping, tokens) {
	let idx = -1;
	let t = void 0;
	function advance() {
		idx += 1;
		return tokens[idx];
	}
	const msgs = [];
	while (true) {
		t = advance();
		if (!t) break;
		if (t.kind !== "Keyword") continue;
		assertIsDefined(t.value);
		const keyword = t.value;
		const charIndex = t.idx;
		if (tokens[idx + 1]?.kind !== "ParenLeft") continue;
		t = advance();
		t = advance();
		const stringArgs = [];
		while (true) {
			if (!t || t.kind !== "String") break;
			assertIsDefined(t.value);
			stringArgs.push(t.value);
			t = advance();
			if (!t) break;
			if (t.kind !== "Comma") break;
			t = advance();
			if (!t) break;
		}
		if (stringArgs.length) msgs.push(getMsgInfo(mapping, keyword, charIndex, stringArgs));
	}
	return msgs;
}
function getMsgInfo(mapping, keyword, charIdx, stringArgs) {
	if (mapping.simple?.includes(keyword)) return {
		message: stringArgs[0],
		idx: charIdx
	};
	if (mapping.plural?.includes(keyword)) return {
		message: stringArgs[0],
		messagePlural: stringArgs[1],
		idx: charIdx
	};
	if (mapping.ctx?.includes(keyword)) return {
		context: stringArgs[0],
		message: stringArgs[1],
		idx: charIdx
	};
	if (mapping.ctxPlural?.includes(keyword)) return {
		context: stringArgs[0],
		message: stringArgs[1],
		messagePlural: stringArgs[2],
		idx: charIdx
	};
	throw new Error(`no mapping found for keyword "${keyword}", please report this error`);
}
function getKeywords(keywords, overrideDefaults = false) {
	if (overrideDefaults) {
		if (!keywords) throw new Error(`overrideDefaults is enabled but no keywords provided in config`);
		return keywords;
	}
	return {
		simple: ["$gettext", ...keywords?.simple ? keywords?.simple : []],
		plural: ["$ngettext", ...keywords?.plural ? keywords?.plural : []],
		ctxPlural: ["$npgettext", ...keywords?.ctxPlural ? keywords?.ctxPlural : []],
		ctx: ["$pgettext", ...keywords?.ctx ? keywords?.ctx : []]
	};
}
/** Careful: API is not stable */
function parseSrc(src, options) {
	const keywords = getKeywords(options?.mapping, options?.overrideDefaults);
	return parseFunctionCall(keywords, tokenize(keywords, src)).map((info) => {
		const i = { ...info };
		delete i.idx;
		return {
			...i,
			lineNumber: src.substring(0, info.idx).split("\n").length
		};
	});
}
/** Careful: API is not stable */
function makePO(fileName, msgs) {
	const po = new import_po.default();
	for (const msg of msgs) {
		const item = new import_po.default.Item();
		item.msgid = msg.message;
		item.msgid_plural = msg.messagePlural;
		item.msgctxt = msg.context;
		item.references = [`${fileName}:${msg.lineNumber}`];
		po.items.push(item);
	}
	return po;
}
//#endregion
export { normalizeTranslations as a, computed as c, normalizeMsgId as i, reactive as l, parseSrc as n, useGettext as o, tokenize as r, GetTextSymbol as s, makePO as t, ref as u };
