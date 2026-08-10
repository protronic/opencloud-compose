import { createRequire } from "node:module";
import path from "node:path";
import { exec } from "node:child_process";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region node_modules/array-back/index.js
/**
* Takes any input and guarantees an array back.
*
* - Converts array-like objects (e.g. `arguments`, `Set`) to a real array.
* - Converts `undefined` to an empty array.
* - Converts any another other, singular value (including `null`, objects and iterables other than `Set`) into an array containing that value.
* - Ignores input which is already an array.
*
* @module array-back
* @example
* > const arrayify = require('array-back')
*
* > arrayify(undefined)
* []
*
* > arrayify(null)
* [ null ]
*
* > arrayify(0)
* [ 0 ]
*
* > arrayify([ 1, 2 ])
* [ 1, 2 ]
*
* > arrayify(new Set([ 1, 2 ]))
* [ 1, 2 ]
*
* > function f(){ return arrayify(arguments); }
* > f(1,2,3)
* [ 1, 2, 3 ]
*/
function isObject$1(input) {
	return typeof input === "object" && input !== null;
}
function isArrayLike$1(input) {
	return isObject$1(input) && typeof input.length === "number";
}
/**
* @param {*} - The input value to convert to an array
* @returns {Array}
* @alias module:array-back
*/
function arrayify(input) {
	if (Array.isArray(input)) return input;
	else if (input === void 0) return [];
	else if (isArrayLike$1(input) || input instanceof Set) return Array.from(input);
	else return [input];
}
//#endregion
//#region node_modules/find-replace/index.js
/**
* @module find-replace
*/
/**
* @param {array} - The input array
* @param {function} - A predicate function which, if returns `true` causes the current item to be operated on.
* @param [replaceWith] {...any} - If not specified, each found value will be removed. If specified, each found value will be replaced with this value. If the `replaceWith` value is a function, it will be invoked with the found value and its result used as the replace value. If the `replaceWith` function returns an array, the found value will be replaced with each item in the array (not replaced with the array itself).
* @returns {array}
* @alias module:find-replace
*/
function findReplace(array, findFn, ...replaceWiths) {
	const found = [];
	if (!Array.isArray(array)) throw new Error("Input must be an array");
	for (const [index, value] of array.entries()) {
		let expanded = [];
		replaceWiths.forEach((replaceWith) => {
			if (typeof replaceWith === "function") expanded = expanded.concat(replaceWith(value));
			else expanded.push(replaceWith);
		});
		if (findFn(value)) found.push({
			index,
			replaceWithValue: expanded
		});
	}
	for (const item of found.reverse()) {
		const spliceArgs = [item.index, 1].concat(item.replaceWithValue);
		array.splice.apply(array, spliceArgs);
	}
	return array;
}
//#endregion
//#region node_modules/command-line-args/lib/argv-tools.js
/**
* Some useful tools for working with `process.argv`.
*
* @module argv-tools
* @typicalName argvTools
* @example
* const argvTools = require('argv-tools')
*/
/**
* Regular expressions for matching option formats.
* @static
*/
const re = {
	short: /^-([^\d-])$/,
	long: /^--(\S+)/,
	combinedShort: /^-[^\d-]{2,}$/,
	optEquals: /^(--\S+?)=(.*)/
};
/**
* Array subclass encapsulating common operations on `process.argv`.
* @static
*/
var ArgvArray = class extends Array {
	/**
	* Clears the array has loads the supplied input.
	* @param {string[]} argv - The argv list to load. Defaults to `process.argv`.
	*/
	load(argv) {
		this.clear();
		if (argv && argv !== process.argv) argv = arrayify(argv);
		else {
			argv = process.argv.slice(0);
			const deleteCount = process.execArgv.some(isExecArg) ? 1 : 2;
			argv.splice(0, deleteCount);
		}
		argv.forEach((arg) => this.push(String(arg)));
	}
	/**
	* Clear the array.
	*/
	clear() {
		this.length = 0;
	}
	/**
	* expand ``--option=value` style args.
	*/
	expandOptionEqualsNotation() {
		if (this.some((arg) => re.optEquals.test(arg))) {
			const expandedArgs = [];
			this.forEach((arg) => {
				const matches = arg.match(re.optEquals);
				if (matches) expandedArgs.push(matches[1], matches[2]);
				else expandedArgs.push(arg);
			});
			this.clear();
			this.load(expandedArgs);
		}
	}
	/**
	* expand getopt-style combinedShort options.
	*/
	expandGetoptNotation() {
		if (this.hasCombinedShortOptions()) findReplace(this, re.combinedShort, expandCombinedShortArg);
	}
	/**
	* Returns true if the array contains combined short options (e.g. `-ab`).
	* @returns {boolean}
	*/
	hasCombinedShortOptions() {
		return this.some((arg) => re.combinedShort.test(arg));
	}
	static from(argv) {
		const result = new this();
		result.load(argv);
		return result;
	}
};
/**
* Expand a combined short option.
* @param {string} - the string to expand, e.g. `-ab`
* @returns {string[]}
* @static
*/
function expandCombinedShortArg(arg) {
	arg = arg.slice(1);
	return arg.split("").map((letter) => "-" + letter);
}
/**
* Returns true if the supplied arg matches `--option=value` notation.
* @param {string} - the arg to test, e.g. `--one=something`
* @returns {boolean}
* @static
*/
function isOptionEqualsNotation(arg) {
	return re.optEquals.test(arg);
}
/**
* Returns true if the supplied arg is in either long (`--one`) or short (`-o`) format.
* @param {string} - the arg to test, e.g. `--one`
* @returns {boolean}
* @static
*/
function isOption(arg) {
	return (re.short.test(arg) || re.long.test(arg)) && !re.optEquals.test(arg);
}
/**
* Returns true if the supplied arg is in long (`--one`) format.
* @param {string} - the arg to test, e.g. `--one`
* @returns {boolean}
* @static
*/
function isLongOption(arg) {
	return re.long.test(arg) && !isOptionEqualsNotation(arg);
}
/**
* Returns the name from a long, short or `--options=value` arg.
* @param {string} - the arg to inspect, e.g. `--one`
* @returns {string}
* @static
*/
function getOptionName(arg) {
	if (re.short.test(arg)) return arg.match(re.short)[1];
	else if (isLongOption(arg)) return arg.match(re.long)[1];
	else if (isOptionEqualsNotation(arg)) return arg.match(re.optEquals)[1].replace(/^--/, "");
	else return null;
}
function isValue(arg) {
	return !(isOption(arg) || re.combinedShort.test(arg) || re.optEquals.test(arg));
}
function isExecArg(arg) {
	return ["--eval", "-e"].indexOf(arg) > -1 || arg.startsWith("--eval=");
}
//#endregion
//#region node_modules/typical/index.js
/**
* Isomorphic, functional type-checking for Javascript.
* @module typical
* @typicalname t
* @example
* import t from 'typical'
* const allDefined = array.every(t.isDefined)
*/
/**
* Returns true if input is a number (including infinity). It is a more reasonable alternative to `typeof n` which returns `number` for `NaN`.
*
* @param {*} n - The input to test
* @returns {boolean} `true` if input is a number
* @static
* @example
* > t.isNumber(0)
* true
* > t.isNumber(1)
* true
* > t.isNumber(1.1)
* true
* > t.isNumber(0xff)
* true
* > t.isNumber(0644)
* true
* > t.isNumber(6.2e5)
* true
* > t.isNumber(NaN)
* false
* > t.isNumber(Infinity)
* true
*/
function isNumber(n) {
	return !isNaN(parseFloat(n));
}
/**
* Returns true if input is a finite number. Identical to `isNumber` beside excluding infinity.
*
* @param {*} n - The input to test
* @returns {boolean}
* @static
* @example
* > t.isFiniteNumber(0)
* true
* > t.isFiniteNumber(1)
* true
* > t.isFiniteNumber(1.1)
* true
* > t.isFiniteNumber(0xff)
* true
* > t.isFiniteNumber(0644)
* true
* > t.isFiniteNumber(6.2e5)
* true
* > t.isFiniteNumber(NaN)
* false
* > t.isFiniteNumber(Infinity)
* false
*/
function isFiniteNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}
/**
* A plain object is a simple object literal, it is not an instance of a class. Returns true if the input `typeof` is `object` and directly decends from `Object`.
*
* @param {*} input - The input to test
* @returns {boolean}
* @static
* @example
* > t.isPlainObject({ something: 'one' })
* true
* > t.isPlainObject(new Date())
* false
* > t.isPlainObject([ 0, 1 ])
* false
* > t.isPlainObject(/test/)
* false
* > t.isPlainObject(1)
* false
* > t.isPlainObject('one')
* false
* > t.isPlainObject(null)
* false
* > t.isPlainObject((function * () {})())
* false
* > t.isPlainObject(function * () {})
* false
*/
function isPlainObject(input) {
	return input !== null && typeof input === "object" && input.constructor === Object;
}
/**
* An array-like value has all the properties of an array yet is not an array instance. An example is the `arguments` object. Returns `true`` if the input value is an object, not `null`` and has a `length` property set with a numeric value.
*
* @param {*} input - The input to test
* @returns {boolean}
* @static
* @example
* function sum(x, y){
*   console.log(t.isArrayLike(arguments))
*   // prints `true`
* }
*/
function isArrayLike(input) {
	return isObject(input) && typeof input.length === "number";
}
/**
* Returns true if the typeof input is `'object'` but not null.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isObject(input) {
	return typeof input === "object" && input !== null;
}
/**
* Returns true if the input value is defined.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isDefined(input) {
	return typeof input !== "undefined";
}
/**
* Returns true if the input value is undefined.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isUndefined(input) {
	return !isDefined(input);
}
/**
* Returns true if the input value is null.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isNull(input) {
	return input === null;
}
/**
* Returns true if the input value is not one of `undefined`, `null`, or `NaN`.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isDefinedValue(input) {
	return isDefined(input) && !isNull(input) && !Number.isNaN(input);
}
/**
* Returns true if the input value is an ES2015 `class`.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isClass(input) {
	if (typeof input === "function") return /^class /.test(Function.prototype.toString.call(input));
	else return false;
}
/**
* Returns true if the input is a string, number, symbol, boolean, null or undefined value.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isPrimitive(input) {
	if (input === null) return true;
	switch (typeof input) {
		case "string":
		case "number":
		case "symbol":
		case "undefined":
		case "boolean": return true;
		default: return false;
	}
}
/**
* Returns true if the input is a Promise.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isPromise(input) {
	if (input) {
		const isPromise = isDefined(Promise) && input instanceof Promise;
		const isThenable = input.then && typeof input.then === "function";
		return !!(isPromise || isThenable);
	} else return false;
}
/**
* Returns true if the input is an iterable (`Map`, `Set`, `Array`, Generator etc.).
* @param {*} input - The input to test
* @returns {boolean}
* @static
* @example
* > t.isIterable('string')
* true
* > t.isIterable(new Map())
* true
* > t.isIterable([])
* true
* > t.isIterable((function * () {})())
* true
* > t.isIterable(Promise.resolve())
* false
* > t.isIterable(Promise)
* false
* > t.isIterable(true)
* false
* > t.isIterable({})
* false
* > t.isIterable(0)
* false
* > t.isIterable(1.1)
* false
* > t.isIterable(NaN)
* false
* > t.isIterable(Infinity)
* false
* > t.isIterable(function () {})
* false
* > t.isIterable(Date)
* false
* > t.isIterable()
* false
* > t.isIterable({ then: function () {} })
* false
*/
function isIterable(input) {
	if (input === null || !isDefined(input)) return false;
	else return typeof input[Symbol.iterator] === "function" || typeof input[Symbol.asyncIterator] === "function";
}
/**
* Returns true if the input value is a string. The equivalent of `typeof input === 'string'` for use in funcitonal contexts.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isString(input) {
	return typeof input === "string";
}
/**
* Returns true if the input value is a function. The equivalent of `typeof input === 'function'` for use in funcitonal contexts.
* @param {*} input - The input to test
* @returns {boolean}
* @static
*/
function isFunction(input) {
	return typeof input === "function";
}
/**
* Returns true if the input value is an async function or method.
* @param {*} input - The input to test
* @returns {boolean}
* @static
* @example
* > t.isAsyncFunction(function () {})
* false
* > t.isAsyncFunction(new Function())
* false
* > t.isAsyncFunction(() => {})
* false
* > t.isAsyncFunction(async function () {})
* true
* > const AsyncFunction = async function () {}.constructor
* > t.isAsyncFunction(new AsyncFunction())
* true
* > t.isAsyncFunction(async () => {})
* true
* > class Command { async execute () {} }
* > t.isAsyncFunction(new Command().execute)
* true
*/
function isAsyncFunction(input) {
	return typeof input === "function" && input.constructor.name === "AsyncFunction";
}
var typical_default = {
	isNumber,
	isFiniteNumber,
	isPlainObject,
	isArrayLike,
	isObject,
	isDefined,
	isUndefined,
	isNull,
	isDefinedValue,
	isClass,
	isPrimitive,
	isPromise,
	isIterable,
	isString,
	isFunction,
	isAsyncFunction
};
//#endregion
//#region node_modules/command-line-args/lib/option-definition.js
/**
* @module option-definition
*/
/**
* Describes a command-line option. Additionally, if generating a usage guide with [command-line-usage](https://github.com/75lb/command-line-usage) you could optionally add `description` and `typeLabel` properties to each definition.
*
* @alias module:option-definition
* @typicalname option
*/
var OptionDefinition = class {
	constructor(definition) {
		/**
		* The only required definition property is `name`, so the simplest working example is
		* ```js
		* const optionDefinitions = [
		*   { name: 'file' },
		*   { name: 'depth' }
		* ]
		* ```
		*
		* Where a `type` property is not specified it will default to `String`.
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | -------------------- | ------------ |
		* | 1   | `--file` | `{ file: null }` |
		* | 2   | `--file lib.js` | `{ file: 'lib.js' }` |
		* | 3   | `--depth 2` | `{ depth: '2' }` |
		*
		* Unicode option names and aliases are valid, for example:
		* ```js
		* const optionDefinitions = [
		*   { name: 'один' },
		*   { name: '两' },
		*   { name: 'три', alias: 'т' }
		* ]
		* ```
		* @type {string}
		*/
		this.name = definition.name;
		/**
		* The `type` value is a setter function (you receive the output from this), enabling you to be specific about the type and value received.
		*
		* The most common values used are `String` (the default), `Number` and `Boolean` but you can use a custom function, for example:
		*
		* ```js
		* const fs = require('fs')
		*
		* class FileDetails {
		*   constructor (filename) {
		*     this.filename = filename
		*     this.exists = fs.existsSync(filename)
		*   }
		* }
		*
		* const cli = commandLineArgs([
		*   { name: 'file', type: filename => new FileDetails(filename) },
		*   { name: 'depth', type: Number }
		* ])
		* ```
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ----------------- | ------------ |
		* | 1   | `--file asdf.txt` | `{ file: { filename: 'asdf.txt', exists: false } }` |
		*
		* The `--depth` option expects a `Number`. If no value was set, you will receive `null`.
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ----------------- | ------------ |
		* | 2   | `--depth` | `{ depth: null }` |
		* | 3   | `--depth 2` | `{ depth: 2 }` |
		*
		* @type {function}
		* @default String
		*/
		this.type = definition.type || String;
		/**
		* getopt-style short option names. Can be any single character (unicode included) except a digit or hyphen.
		*
		* ```js
		* const optionDefinitions = [
		*   { name: 'hot', alias: 'h', type: Boolean },
		*   { name: 'discount', alias: 'd', type: Boolean },
		*   { name: 'courses', alias: 'c' , type: Number }
		* ]
		* ```
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ------------ | ------------ |
		* | 1   | `-hcd` | `{ hot: true, courses: null, discount: true }` |
		* | 2   | `-hdc 3` | `{ hot: true, discount: true, courses: 3 }` |
		*
		* @type {string}
		*/
		this.alias = definition.alias;
		/**
		* Set this flag if the option takes a list of values. You will receive an array of values, each passed through the `type` function (if specified).
		*
		* ```js
		* const optionDefinitions = [
		*   { name: 'files', type: String, multiple: true }
		* ]
		* ```
		*
		* Note, examples 1 and 3 below demonstrate "greedy" parsing which can be disabled by using `lazyMultiple`.
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ------------ | ------------ |
		* | 1   | `--files one.js two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
		* | 2   | `--files one.js --files two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
		* | 3   | `--files *` | `{ files: [ 'one.js', 'two.js' ] }` |
		*
		* @type {boolean}
		*/
		this.multiple = definition.multiple;
		/**
		* Identical to `multiple` but with greedy parsing disabled.
		*
		* ```js
		* const optionDefinitions = [
		*   { name: 'files', lazyMultiple: true },
		*   { name: 'verbose', alias: 'v', type: Boolean, lazyMultiple: true }
		* ]
		* ```
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ------------ | ------------ |
		* | 1   | `--files one.js --files two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
		* | 2   | `-vvv` | `{ verbose: [ true, true, true ] }` |
		*
		* @type {boolean}
		*/
		this.lazyMultiple = definition.lazyMultiple;
		/**
		* Any values unaccounted for by an option definition will be set on the `defaultOption`. This flag is typically set on the most commonly-used option to make for more concise usage (i.e. `$ example *.js` instead of `$ example --files *.js`).
		*
		* ```js
		* const optionDefinitions = [
		*   { name: 'files', multiple: true, defaultOption: true }
		* ]
		* ```
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ------------ | ------------ |
		* | 1   | `--files one.js two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
		* | 2   | `one.js two.js` | `{ files: [ 'one.js', 'two.js' ] }` |
		* | 3   | `*` | `{ files: [ 'one.js', 'two.js' ] }` |
		*
		* @type {boolean}
		*/
		this.defaultOption = definition.defaultOption;
		/**
		* An initial value for the option.
		*
		* ```js
		* const optionDefinitions = [
		*   { name: 'files', multiple: true, defaultValue: [ 'one.js' ] },
		*   { name: 'max', type: Number, defaultValue: 3 }
		* ]
		* ```
		*
		* | #   | argv input | commandLineArgs() output |
		* | --- | ------------ | ------------ |
		* | 1   |  | `{ files: [ 'one.js' ], max: 3 }` |
		* | 2   | `--files two.js` | `{ files: [ 'two.js' ], max: 3 }` |
		* | 3   | `--max 4` | `{ files: [ 'one.js' ], max: 4 }` |
		*
		* @type {*}
		*/
		this.defaultValue = definition.defaultValue;
		/**
		* When your app has a large amount of options it makes sense to organise them in groups.
		*
		* There are two automatic groups: `_all` (contains all options) and `_none` (contains options without a `group` specified in their definition).
		*
		* ```js
		* const optionDefinitions = [
		*   { name: 'verbose', group: 'standard' },
		*   { name: 'help', group: [ 'standard', 'main' ] },
		*   { name: 'compress', group: [ 'server', 'main' ] },
		*   { name: 'static', group: 'server' },
		*   { name: 'debug' }
		* ]
		* ```
		*
		*<table>
		*  <tr>
		*    <th>#</th><th>Command Line</th><th>commandLineArgs() output</th>
		*  </tr>
		*  <tr>
		*    <td>1</td><td><code>--verbose</code></td><td><pre><code>
		*{
		*  _all: { verbose: true },
		*  standard: { verbose: true }
		*}
		*</code></pre></td>
		*  </tr>
		*  <tr>
		*    <td>2</td><td><code>--debug</code></td><td><pre><code>
		*{
		*  _all: { debug: true },
		*  _none: { debug: true }
		*}
		*</code></pre></td>
		*  </tr>
		*  <tr>
		*    <td>3</td><td><code>--verbose --debug --compress</code></td><td><pre><code>
		*{
		*  _all: {
		*    verbose: true,
		*    debug: true,
		*    compress: true
		*  },
		*  standard: { verbose: true },
		*  server: { compress: true },
		*  main: { compress: true },
		*  _none: { debug: true }
		*}
		*</code></pre></td>
		*  </tr>
		*  <tr>
		*    <td>4</td><td><code>--compress</code></td><td><pre><code>
		*{
		*  _all: { compress: true },
		*  server: { compress: true },
		*  main: { compress: true }
		*}
		*</code></pre></td>
		*  </tr>
		*</table>
		*
		* @type {string|string[]}
		*/
		this.group = definition.group;
		for (const prop in definition) if (!this[prop]) this[prop] = definition[prop];
	}
	isBoolean() {
		return this.type === Boolean || typical_default.isFunction(this.type) && this.type.name === "Boolean";
	}
	isMultiple() {
		return this.multiple || this.lazyMultiple;
	}
	static create(def) {
		return new this(def);
	}
};
//#endregion
//#region node_modules/command-line-args/lib/option-definitions.js
/**
* @module option-definitions
*/
/**
* @alias module:option-definitions
*/
var Definitions = class extends Array {
	/**
	* validate option definitions
	* @param {boolean} [caseInsensitive=false] - whether arguments will be parsed in a case insensitive manner
	* @returns {string}
	*/
	validate(caseInsensitive) {
		if (this.some((def) => !def.name)) halt("INVALID_DEFINITIONS", "Invalid option definitions: the `name` property is required on each definition");
		if (this.some((def) => def.type && typeof def.type !== "function")) halt("INVALID_DEFINITIONS", "Invalid option definitions: the `type` property must be a setter fuction (default: `Boolean`)");
		let invalidOption;
		if (this.some((def) => {
			invalidOption = def;
			return typical_default.isDefined(def.alias) && typical_default.isNumber(def.alias);
		})) halt("INVALID_DEFINITIONS", "Invalid option definition: to avoid ambiguity an alias cannot be numeric [--" + invalidOption.name + " alias is -" + invalidOption.alias + "]");
		if (this.some((def) => {
			invalidOption = def;
			return typical_default.isDefined(def.alias) && def.alias.length !== 1;
		})) halt("INVALID_DEFINITIONS", "Invalid option definition: an alias must be a single character");
		if (this.some((def) => {
			invalidOption = def;
			return def.alias === "-";
		})) halt("INVALID_DEFINITIONS", "Invalid option definition: an alias cannot be \"-\"");
		if (hasDuplicates(this.map((def) => caseInsensitive ? def.name.toLowerCase() : def.name))) halt("INVALID_DEFINITIONS", "Two or more option definitions have the same name");
		if (hasDuplicates(this.map((def) => caseInsensitive && typical_default.isDefined(def.alias) ? def.alias.toLowerCase() : def.alias))) halt("INVALID_DEFINITIONS", "Two or more option definitions have the same alias");
		if (this.filter((def) => def.defaultOption === true).length > 1) halt("INVALID_DEFINITIONS", "Only one option definition can be the defaultOption");
		if (this.some((def) => {
			invalidOption = def;
			return def.isBoolean() && def.defaultOption;
		})) halt("INVALID_DEFINITIONS", `A boolean option ["${invalidOption.name}"] can not also be the defaultOption.`);
	}
	/**
	* Get definition by option arg (e.g. `--one` or `-o`)
	* @param {string} [arg] the argument name to get the definition for
	* @param {boolean} [caseInsensitive] whether to use case insensitive comparisons when finding the appropriate definition
	* @returns {Definition}
	*/
	get(arg, caseInsensitive) {
		if (isOption(arg)) if (re.short.test(arg)) {
			const shortOptionName = getOptionName(arg);
			if (caseInsensitive) {
				const lowercaseShortOptionName = shortOptionName.toLowerCase();
				return this.find((def) => typical_default.isDefined(def.alias) && def.alias.toLowerCase() === lowercaseShortOptionName);
			} else return this.find((def) => def.alias === shortOptionName);
		} else {
			const optionName = getOptionName(arg);
			if (caseInsensitive) {
				const lowercaseOptionName = optionName.toLowerCase();
				return this.find((def) => def.name.toLowerCase() === lowercaseOptionName);
			} else return this.find((def) => def.name === optionName);
		}
		else return this.find((def) => def.name === arg);
	}
	getDefault() {
		return this.find((def) => def.defaultOption === true);
	}
	isGrouped() {
		return this.some((def) => def.group);
	}
	whereGrouped() {
		return this.filter(containsValidGroup);
	}
	whereNotGrouped() {
		return this.filter((def) => !containsValidGroup(def));
	}
	whereDefaultValueSet() {
		return this.filter((def) => typical_default.isDefined(def.defaultValue));
	}
	static from(definitions, caseInsensitive) {
		if (definitions instanceof this) return definitions;
		const result = super.from(arrayify(definitions), (def) => OptionDefinition.create(def));
		result.validate(caseInsensitive);
		return result;
	}
};
function halt(name, message) {
	const err = new Error(message);
	err.name = name;
	throw err;
}
function containsValidGroup(def) {
	return arrayify(def.group).some((group) => group);
}
function hasDuplicates(array) {
	const items = {};
	for (let i = 0; i < array.length; i++) {
		const value = array[i];
		if (items[value]) return true;
		else if (typical_default.isDefined(value)) items[value] = true;
	}
}
//#endregion
//#region node_modules/command-line-args/lib/argv-parser.js
/**
* @module argv-parser
*/
/**
* @alias module:argv-parser
*/
var ArgvParser = class {
	/**
	* @param {OptionDefinitions} - Definitions array
	* @param {object} [options] - Options
	* @param {string[]} [options.argv] - Overrides `process.argv`
	* @param {boolean} [options.stopAtFirstUnknown] -
	* @param {boolean} [options.caseInsensitive] - Arguments will be parsed in a case insensitive manner. Defaults to false.
	*/
	constructor(definitions, options) {
		this.options = Object.assign({}, options);
		/**
		* Option Definitions
		*/
		this.definitions = Definitions.from(definitions, this.options.caseInsensitive);
		/**
		* Argv
		*/
		this.argv = ArgvArray.from(this.options.argv);
		if (this.argv.hasCombinedShortOptions()) findReplace(this.argv, re.combinedShort.test.bind(re.combinedShort), (arg) => {
			arg = arg.slice(1);
			return arg.split("").map((letter) => ({
				origArg: `-${arg}`,
				arg: "-" + letter
			}));
		});
	}
	/**
	* Yields one `{ event, name, value, arg, def }` argInfo object for each arg in `process.argv` (or `options.argv`).
	*/
	*[Symbol.iterator]() {
		const definitions = this.definitions;
		let def;
		let value;
		let name;
		let event;
		let singularDefaultSet = false;
		let unknownFound = false;
		let origArg;
		for (let arg of this.argv) {
			if (typical_default.isPlainObject(arg)) {
				origArg = arg.origArg;
				arg = arg.arg;
			}
			if (unknownFound && this.options.stopAtFirstUnknown) {
				yield {
					event: "unknown_value",
					arg,
					name: "_unknown",
					value: void 0
				};
				continue;
			}
			if (isOption(arg)) {
				def = definitions.get(arg, this.options.caseInsensitive);
				value = void 0;
				if (def) {
					value = def.isBoolean() ? true : null;
					event = "set";
				} else event = "unknown_option";
			} else if (isOptionEqualsNotation(arg)) {
				const matches = arg.match(re.optEquals);
				def = definitions.get(matches[1], this.options.caseInsensitive);
				if (def) if (def.isBoolean()) {
					yield {
						event: "unknown_value",
						arg,
						name: "_unknown",
						value,
						def
					};
					event = "set";
					value = true;
				} else {
					event = "set";
					value = matches[2];
				}
				else event = "unknown_option";
			} else if (isValue(arg)) if (def) {
				value = arg;
				event = "set";
			} else {
				def = this.definitions.getDefault();
				if (def && !singularDefaultSet) {
					value = arg;
					event = "set";
				} else {
					event = "unknown_value";
					def = void 0;
				}
			}
			name = def ? def.name : "_unknown";
			const argInfo = {
				event,
				arg,
				name,
				value,
				def
			};
			if (origArg) {
				argInfo.subArg = arg;
				argInfo.arg = origArg;
			}
			yield argInfo;
			if (name === "_unknown") unknownFound = true;
			if (def && def.defaultOption && !def.isMultiple() && event === "set") singularDefaultSet = true;
			if (def && def.isBoolean()) def = void 0;
			if (def && !def.multiple && typical_default.isDefined(value) && value !== null) def = void 0;
			value = void 0;
			event = void 0;
			name = void 0;
			origArg = void 0;
		}
	}
};
//#endregion
//#region node_modules/command-line-args/lib/option.js
const _value = /* @__PURE__ */ new WeakMap();
/**
* Encapsulates behaviour (defined by an OptionDefinition) when setting values
*/
var Option = class {
	constructor(definition) {
		this.definition = new OptionDefinition(definition);
		this.state = null;
		this.resetToDefault();
	}
	get() {
		return _value.get(this);
	}
	set(val) {
		this._set(val, "set");
	}
	_set(val, state) {
		const def = this.definition;
		if (def.isMultiple()) {
			if (val !== null && val !== void 0) {
				const arr = this.get();
				if (this.state === "default") arr.length = 0;
				arr.push(def.type(val));
				this.state = state;
			}
		} else if (!def.isMultiple() && this.state === "set") {
			const err = /* @__PURE__ */ new Error(`Singular option already set [${this.definition.name}=${this.get()}]`);
			err.name = "ALREADY_SET";
			err.value = val;
			err.optionName = def.name;
			throw err;
		} else if (val === null || val === void 0) _value.set(this, val);
		else {
			_value.set(this, def.type(val));
			this.state = state;
		}
	}
	resetToDefault() {
		if (typical_default.isDefined(this.definition.defaultValue)) if (this.definition.isMultiple()) _value.set(this, arrayify(this.definition.defaultValue).slice());
		else _value.set(this, this.definition.defaultValue);
		else if (this.definition.isMultiple()) _value.set(this, []);
		else _value.set(this, null);
		this.state = "default";
	}
	static create(definition) {
		definition = new OptionDefinition(definition);
		if (definition.isBoolean()) return FlagOption.create(definition);
		else return new this(definition);
	}
};
var FlagOption = class extends Option {
	set(val) {
		super.set(true);
	}
	static create(def) {
		return new this(def);
	}
};
//#endregion
//#region node_modules/command-line-args/lib/output.js
var import_lodash_camelcase = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* lodash (Custom Build) <https://lodash.com/>
	* Build: `lodash modularize exports="npm" -o ./`
	* Copyright jQuery Foundation and other contributors <https://jquery.org/>
	* Released under MIT license <https://lodash.com/license>
	* Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	* Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	*/
	/** Used as references for various `Number` constants. */
	var INFINITY = Infinity;
	/** `Object#toString` result references. */
	var symbolTag = "[object Symbol]";
	/** Used to match words composed of alphanumeric characters. */
	var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
	/** Used to match Latin Unicode letters (excluding mathematical operators). */
	var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
	/** Used to compose unicode character classes. */
	var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f\\ufe20-\\ufe23", rsComboSymbolsRange = "\\u20d0-\\u20f0", rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
	/** Used to compose unicode capture groups. */
	var rsApos = "['’]", rsAstral = "[" + rsAstralRange + "]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboMarksRange + rsComboSymbolsRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
	/** Used to compose unicode regexes. */
	var rsLowerMisc = "(?:" + rsLower + "|" + rsMisc + ")", rsUpperMisc = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptLowerContr = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptUpperContr = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [
		rsNonAstral,
		rsRegional,
		rsSurrPair
	].join("|") + ")" + rsOptVar + reOptMod + ")*", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [
		rsDingbat,
		rsRegional,
		rsSurrPair
	].join("|") + ")" + rsSeq, rsSymbol = "(?:" + [
		rsNonAstral + rsCombo + "?",
		rsCombo,
		rsRegional,
		rsSurrPair,
		rsAstral
	].join("|") + ")";
	/** Used to match apostrophes. */
	var reApos = RegExp(rsApos, "g");
	/**
	* Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
	* [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
	*/
	var reComboMark = RegExp(rsCombo, "g");
	/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
	var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
	/** Used to match complex or compound words. */
	var reUnicodeWord = RegExp([
		rsUpper + "?" + rsLower + "+" + rsOptLowerContr + "(?=" + [
			rsBreak,
			rsUpper,
			"$"
		].join("|") + ")",
		rsUpperMisc + "+" + rsOptUpperContr + "(?=" + [
			rsBreak,
			rsUpper + rsLowerMisc,
			"$"
		].join("|") + ")",
		rsUpper + "?" + rsLowerMisc + "+" + rsOptLowerContr,
		rsUpper + "+" + rsOptUpperContr,
		rsDigits,
		rsEmoji
	].join("|"), "g");
	/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
	var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboMarksRange + rsComboSymbolsRange + rsVarRange + "]");
	/** Used to detect strings that need a more robust regexp to match words. */
	var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
	/** Used to map Latin Unicode letters to basic Latin letters. */
	var deburredLetters = {
		"À": "A",
		"Á": "A",
		"Â": "A",
		"Ã": "A",
		"Ä": "A",
		"Å": "A",
		"à": "a",
		"á": "a",
		"â": "a",
		"ã": "a",
		"ä": "a",
		"å": "a",
		"Ç": "C",
		"ç": "c",
		"Ð": "D",
		"ð": "d",
		"È": "E",
		"É": "E",
		"Ê": "E",
		"Ë": "E",
		"è": "e",
		"é": "e",
		"ê": "e",
		"ë": "e",
		"Ì": "I",
		"Í": "I",
		"Î": "I",
		"Ï": "I",
		"ì": "i",
		"í": "i",
		"î": "i",
		"ï": "i",
		"Ñ": "N",
		"ñ": "n",
		"Ò": "O",
		"Ó": "O",
		"Ô": "O",
		"Õ": "O",
		"Ö": "O",
		"Ø": "O",
		"ò": "o",
		"ó": "o",
		"ô": "o",
		"õ": "o",
		"ö": "o",
		"ø": "o",
		"Ù": "U",
		"Ú": "U",
		"Û": "U",
		"Ü": "U",
		"ù": "u",
		"ú": "u",
		"û": "u",
		"ü": "u",
		"Ý": "Y",
		"ý": "y",
		"ÿ": "y",
		"Æ": "Ae",
		"æ": "ae",
		"Þ": "Th",
		"þ": "th",
		"ß": "ss",
		"Ā": "A",
		"Ă": "A",
		"Ą": "A",
		"ā": "a",
		"ă": "a",
		"ą": "a",
		"Ć": "C",
		"Ĉ": "C",
		"Ċ": "C",
		"Č": "C",
		"ć": "c",
		"ĉ": "c",
		"ċ": "c",
		"č": "c",
		"Ď": "D",
		"Đ": "D",
		"ď": "d",
		"đ": "d",
		"Ē": "E",
		"Ĕ": "E",
		"Ė": "E",
		"Ę": "E",
		"Ě": "E",
		"ē": "e",
		"ĕ": "e",
		"ė": "e",
		"ę": "e",
		"ě": "e",
		"Ĝ": "G",
		"Ğ": "G",
		"Ġ": "G",
		"Ģ": "G",
		"ĝ": "g",
		"ğ": "g",
		"ġ": "g",
		"ģ": "g",
		"Ĥ": "H",
		"Ħ": "H",
		"ĥ": "h",
		"ħ": "h",
		"Ĩ": "I",
		"Ī": "I",
		"Ĭ": "I",
		"Į": "I",
		"İ": "I",
		"ĩ": "i",
		"ī": "i",
		"ĭ": "i",
		"į": "i",
		"ı": "i",
		"Ĵ": "J",
		"ĵ": "j",
		"Ķ": "K",
		"ķ": "k",
		"ĸ": "k",
		"Ĺ": "L",
		"Ļ": "L",
		"Ľ": "L",
		"Ŀ": "L",
		"Ł": "L",
		"ĺ": "l",
		"ļ": "l",
		"ľ": "l",
		"ŀ": "l",
		"ł": "l",
		"Ń": "N",
		"Ņ": "N",
		"Ň": "N",
		"Ŋ": "N",
		"ń": "n",
		"ņ": "n",
		"ň": "n",
		"ŋ": "n",
		"Ō": "O",
		"Ŏ": "O",
		"Ő": "O",
		"ō": "o",
		"ŏ": "o",
		"ő": "o",
		"Ŕ": "R",
		"Ŗ": "R",
		"Ř": "R",
		"ŕ": "r",
		"ŗ": "r",
		"ř": "r",
		"Ś": "S",
		"Ŝ": "S",
		"Ş": "S",
		"Š": "S",
		"ś": "s",
		"ŝ": "s",
		"ş": "s",
		"š": "s",
		"Ţ": "T",
		"Ť": "T",
		"Ŧ": "T",
		"ţ": "t",
		"ť": "t",
		"ŧ": "t",
		"Ũ": "U",
		"Ū": "U",
		"Ŭ": "U",
		"Ů": "U",
		"Ű": "U",
		"Ų": "U",
		"ũ": "u",
		"ū": "u",
		"ŭ": "u",
		"ů": "u",
		"ű": "u",
		"ų": "u",
		"Ŵ": "W",
		"ŵ": "w",
		"Ŷ": "Y",
		"ŷ": "y",
		"Ÿ": "Y",
		"Ź": "Z",
		"Ż": "Z",
		"Ž": "Z",
		"ź": "z",
		"ż": "z",
		"ž": "z",
		"Ĳ": "IJ",
		"ĳ": "ij",
		"Œ": "Oe",
		"œ": "oe",
		"ŉ": "'n",
		"ſ": "ss"
	};
	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
	/** Detect free variable `self`. */
	var freeSelf = typeof self == "object" && self && self.Object === Object && self;
	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function("return this")();
	/**
	* A specialized version of `_.reduce` for arrays without support for
	* iteratee shorthands.
	*
	* @private
	* @param {Array} [array] The array to iterate over.
	* @param {Function} iteratee The function invoked per iteration.
	* @param {*} [accumulator] The initial value.
	* @param {boolean} [initAccum] Specify using the first element of `array` as
	*  the initial value.
	* @returns {*} Returns the accumulated value.
	*/
	function arrayReduce(array, iteratee, accumulator, initAccum) {
		var index = -1, length = array ? array.length : 0;
		if (initAccum && length) accumulator = array[++index];
		while (++index < length) accumulator = iteratee(accumulator, array[index], index, array);
		return accumulator;
	}
	/**
	* Converts an ASCII `string` to an array.
	*
	* @private
	* @param {string} string The string to convert.
	* @returns {Array} Returns the converted array.
	*/
	function asciiToArray(string) {
		return string.split("");
	}
	/**
	* Splits an ASCII `string` into an array of its words.
	*
	* @private
	* @param {string} The string to inspect.
	* @returns {Array} Returns the words of `string`.
	*/
	function asciiWords(string) {
		return string.match(reAsciiWord) || [];
	}
	/**
	* The base implementation of `_.propertyOf` without support for deep paths.
	*
	* @private
	* @param {Object} object The object to query.
	* @returns {Function} Returns the new accessor function.
	*/
	function basePropertyOf(object) {
		return function(key) {
			return object == null ? void 0 : object[key];
		};
	}
	/**
	* Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
	* letters to basic Latin letters.
	*
	* @private
	* @param {string} letter The matched letter to deburr.
	* @returns {string} Returns the deburred letter.
	*/
	var deburrLetter = basePropertyOf(deburredLetters);
	/**
	* Checks if `string` contains Unicode symbols.
	*
	* @private
	* @param {string} string The string to inspect.
	* @returns {boolean} Returns `true` if a symbol is found, else `false`.
	*/
	function hasUnicode(string) {
		return reHasUnicode.test(string);
	}
	/**
	* Checks if `string` contains a word composed of Unicode symbols.
	*
	* @private
	* @param {string} string The string to inspect.
	* @returns {boolean} Returns `true` if a word is found, else `false`.
	*/
	function hasUnicodeWord(string) {
		return reHasUnicodeWord.test(string);
	}
	/**
	* Converts `string` to an array.
	*
	* @private
	* @param {string} string The string to convert.
	* @returns {Array} Returns the converted array.
	*/
	function stringToArray(string) {
		return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
	}
	/**
	* Converts a Unicode `string` to an array.
	*
	* @private
	* @param {string} string The string to convert.
	* @returns {Array} Returns the converted array.
	*/
	function unicodeToArray(string) {
		return string.match(reUnicode) || [];
	}
	/**
	* Splits a Unicode `string` into an array of its words.
	*
	* @private
	* @param {string} The string to inspect.
	* @returns {Array} Returns the words of `string`.
	*/
	function unicodeWords(string) {
		return string.match(reUnicodeWord) || [];
	}
	/**
	* Used to resolve the
	* [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	* of values.
	*/
	var objectToString = Object.prototype.toString;
	/** Built-in value references. */
	var Symbol = root.Symbol;
	/** Used to convert symbols to primitives and strings. */
	var symbolProto = Symbol ? Symbol.prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
	/**
	* The base implementation of `_.slice` without an iteratee call guard.
	*
	* @private
	* @param {Array} array The array to slice.
	* @param {number} [start=0] The start position.
	* @param {number} [end=array.length] The end position.
	* @returns {Array} Returns the slice of `array`.
	*/
	function baseSlice(array, start, end) {
		var index = -1, length = array.length;
		if (start < 0) start = -start > length ? 0 : length + start;
		end = end > length ? length : end;
		if (end < 0) end += length;
		length = start > end ? 0 : end - start >>> 0;
		start >>>= 0;
		var result = Array(length);
		while (++index < length) result[index] = array[index + start];
		return result;
	}
	/**
	* The base implementation of `_.toString` which doesn't convert nullish
	* values to empty strings.
	*
	* @private
	* @param {*} value The value to process.
	* @returns {string} Returns the string.
	*/
	function baseToString(value) {
		if (typeof value == "string") return value;
		if (isSymbol(value)) return symbolToString ? symbolToString.call(value) : "";
		var result = value + "";
		return result == "0" && 1 / value == -INFINITY ? "-0" : result;
	}
	/**
	* Casts `array` to a slice if it's needed.
	*
	* @private
	* @param {Array} array The array to inspect.
	* @param {number} start The start position.
	* @param {number} [end=array.length] The end position.
	* @returns {Array} Returns the cast slice.
	*/
	function castSlice(array, start, end) {
		var length = array.length;
		end = end === void 0 ? length : end;
		return !start && end >= length ? array : baseSlice(array, start, end);
	}
	/**
	* Creates a function like `_.lowerFirst`.
	*
	* @private
	* @param {string} methodName The name of the `String` case method to use.
	* @returns {Function} Returns the new case function.
	*/
	function createCaseFirst(methodName) {
		return function(string) {
			string = toString(string);
			var strSymbols = hasUnicode(string) ? stringToArray(string) : void 0;
			var chr = strSymbols ? strSymbols[0] : string.charAt(0);
			var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string.slice(1);
			return chr[methodName]() + trailing;
		};
	}
	/**
	* Creates a function like `_.camelCase`.
	*
	* @private
	* @param {Function} callback The function to combine each word.
	* @returns {Function} Returns the new compounder function.
	*/
	function createCompounder(callback) {
		return function(string) {
			return arrayReduce(words(deburr(string).replace(reApos, "")), callback, "");
		};
	}
	/**
	* Checks if `value` is object-like. A value is object-like if it's not `null`
	* and has a `typeof` result of "object".
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	* @example
	*
	* _.isObjectLike({});
	* // => true
	*
	* _.isObjectLike([1, 2, 3]);
	* // => true
	*
	* _.isObjectLike(_.noop);
	* // => false
	*
	* _.isObjectLike(null);
	* // => false
	*/
	function isObjectLike(value) {
		return !!value && typeof value == "object";
	}
	/**
	* Checks if `value` is classified as a `Symbol` primitive or object.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to check.
	* @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	* @example
	*
	* _.isSymbol(Symbol.iterator);
	* // => true
	*
	* _.isSymbol('abc');
	* // => false
	*/
	function isSymbol(value) {
		return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
	}
	/**
	* Converts `value` to a string. An empty string is returned for `null`
	* and `undefined` values. The sign of `-0` is preserved.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category Lang
	* @param {*} value The value to process.
	* @returns {string} Returns the string.
	* @example
	*
	* _.toString(null);
	* // => ''
	*
	* _.toString(-0);
	* // => '-0'
	*
	* _.toString([1, 2, 3]);
	* // => '1,2,3'
	*/
	function toString(value) {
		return value == null ? "" : baseToString(value);
	}
	/**
	* Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category String
	* @param {string} [string=''] The string to convert.
	* @returns {string} Returns the camel cased string.
	* @example
	*
	* _.camelCase('Foo Bar');
	* // => 'fooBar'
	*
	* _.camelCase('--foo-bar--');
	* // => 'fooBar'
	*
	* _.camelCase('__FOO_BAR__');
	* // => 'fooBar'
	*/
	var camelCase = createCompounder(function(result, word, index) {
		word = word.toLowerCase();
		return result + (index ? capitalize(word) : word);
	});
	/**
	* Converts the first character of `string` to upper case and the remaining
	* to lower case.
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category String
	* @param {string} [string=''] The string to capitalize.
	* @returns {string} Returns the capitalized string.
	* @example
	*
	* _.capitalize('FRED');
	* // => 'Fred'
	*/
	function capitalize(string) {
		return upperFirst(toString(string).toLowerCase());
	}
	/**
	* Deburrs `string` by converting
	* [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
	* and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
	* letters to basic Latin letters and removing
	* [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category String
	* @param {string} [string=''] The string to deburr.
	* @returns {string} Returns the deburred string.
	* @example
	*
	* _.deburr('déjà vu');
	* // => 'deja vu'
	*/
	function deburr(string) {
		string = toString(string);
		return string && string.replace(reLatin, deburrLetter).replace(reComboMark, "");
	}
	/**
	* Converts the first character of `string` to upper case.
	*
	* @static
	* @memberOf _
	* @since 4.0.0
	* @category String
	* @param {string} [string=''] The string to convert.
	* @returns {string} Returns the converted string.
	* @example
	*
	* _.upperFirst('fred');
	* // => 'Fred'
	*
	* _.upperFirst('FRED');
	* // => 'FRED'
	*/
	var upperFirst = createCaseFirst("toUpperCase");
	/**
	* Splits `string` into an array of its words.
	*
	* @static
	* @memberOf _
	* @since 3.0.0
	* @category String
	* @param {string} [string=''] The string to inspect.
	* @param {RegExp|string} [pattern] The pattern to match words.
	* @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
	* @returns {Array} Returns the words of `string`.
	* @example
	*
	* _.words('fred, barney, & pebbles');
	* // => ['fred', 'barney', 'pebbles']
	*
	* _.words('fred, barney, & pebbles', /[^, ]+/g);
	* // => ['fred', 'barney', '&', 'pebbles']
	*/
	function words(string, pattern, guard) {
		string = toString(string);
		pattern = guard ? void 0 : pattern;
		if (pattern === void 0) return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
		return string.match(pattern) || [];
	}
	module.exports = camelCase;
})))(), 1);
/**
* A map of { DefinitionNameString: Option }. By default, an Output has an `_unknown` property and any options with defaultValues.
*/
var Output = class extends Map {
	constructor(definitions) {
		super();
		/**
		* @type {OptionDefinitions}
		*/
		this.definitions = Definitions.from(definitions);
		this.set("_unknown", Option.create({
			name: "_unknown",
			multiple: true
		}));
		for (const def of this.definitions.whereDefaultValueSet()) this.set(def.name, Option.create(def));
	}
	toObject(options) {
		options = options || {};
		const output = {};
		for (const item of this) {
			const name = options.camelCase && item[0] !== "_unknown" ? (0, import_lodash_camelcase.default)(item[0]) : item[0];
			const option = item[1];
			if (name === "_unknown" && !option.get().length) continue;
			output[name] = option.get();
		}
		if (options.skipUnknown) delete output._unknown;
		return output;
	}
};
//#endregion
//#region node_modules/command-line-args/lib/output-grouped.js
var GroupedOutput = class extends Output {
	toObject(options) {
		const superOutputNoCamel = super.toObject({ skipUnknown: options.skipUnknown });
		const superOutput = super.toObject(options);
		const unknown = superOutput._unknown;
		delete superOutput._unknown;
		const grouped = { _all: superOutput };
		if (unknown && unknown.length) grouped._unknown = unknown;
		this.definitions.whereGrouped().forEach((def) => {
			const name = options.camelCase ? (0, import_lodash_camelcase.default)(def.name) : def.name;
			const outputValue = superOutputNoCamel[def.name];
			for (const groupName of arrayify(def.group)) {
				grouped[groupName] = grouped[groupName] || {};
				if (typical_default.isDefined(outputValue)) grouped[groupName][name] = outputValue;
			}
		});
		this.definitions.whereNotGrouped().forEach((def) => {
			const name = options.camelCase ? (0, import_lodash_camelcase.default)(def.name) : def.name;
			const outputValue = superOutputNoCamel[def.name];
			if (typical_default.isDefined(outputValue)) {
				if (!grouped._none) grouped._none = {};
				grouped._none[name] = outputValue;
			}
		});
		return grouped;
	}
};
//#endregion
//#region node_modules/command-line-args/index.js
/**
* @module command-line-args
*/
/**
* Returns an object containing all option values set on the command line. By default it parses the global  [`process.argv`](https://nodejs.org/api/process.html#process_process_argv) array.
*
* Parsing is strict by default - an exception is thrown if the user sets a singular option more than once or sets an unknown value or option (one without a valid [definition](https://github.com/75lb/command-line-args/blob/master/doc/option-definition.md)). To be more permissive, enabling [partial](https://github.com/75lb/command-line-args/wiki/Partial-mode-example) or [stopAtFirstUnknown](https://github.com/75lb/command-line-args/wiki/stopAtFirstUnknown) modes will return known options in the usual manner while collecting unknown arguments in a separate `_unknown` property.
*
* @param {Array<OptionDefinition>} - An array of [OptionDefinition](https://github.com/75lb/command-line-args/blob/master/doc/option-definition.md) objects
* @param {object} [options] - Options.
* @param {string[]} [options.argv] - An array of strings which, if present will be parsed instead  of `process.argv`.
* @param {boolean} [options.partial] - If `true`, an array of unknown arguments is returned in the `_unknown` property of the output.
* @param {boolean} [options.stopAtFirstUnknown] - If `true`, parsing will stop at the first unknown argument and the remaining arguments returned in `_unknown`. When set, `partial: true` is also implied.
* @param {boolean} [options.camelCase] - If `true`, options with hypenated names (e.g. `move-to`) will be returned in camel-case (e.g. `moveTo`).
* @param {boolean} [options.caseInsensitive] - If `true`, the case of each option name or alias parsed is insignificant. In other words, both `--Verbose` and `--verbose`, `-V` and `-v` would be equivalent. Defaults to false.
* @returns {object}
* @throws `UNKNOWN_OPTION` If `options.partial` is false and the user set an undefined option. The `err.optionName` property contains the arg that specified an unknown option, e.g. `--one`.
* @throws `UNKNOWN_VALUE` If `options.partial` is false and the user set a value unaccounted for by an option definition. The `err.value` property contains the unknown value, e.g. `5`.
* @throws `ALREADY_SET` If a user sets a singular, non-multiple option more than once. The `err.optionName` property contains the option name that has already been set, e.g. `one`.
* @throws `INVALID_DEFINITIONS`
*   - If an option definition is missing the required `name` property
*   - If an option definition has a `type` value that's not a function
*   - If an alias is numeric, a hyphen or a length other than 1
*   - If an option definition name was used more than once
*   - If an option definition alias was used more than once
*   - If more than one option definition has `defaultOption: true`
*   - If a `Boolean` option is also set as the `defaultOption`.
* @alias module:command-line-args
*/
function commandLineArgs(optionDefinitions, options) {
	options = options || {};
	if (options.stopAtFirstUnknown) options.partial = true;
	optionDefinitions = Definitions.from(optionDefinitions, options.caseInsensitive);
	const parser = new ArgvParser(optionDefinitions, {
		argv: options.argv,
		stopAtFirstUnknown: options.stopAtFirstUnknown,
		caseInsensitive: options.caseInsensitive
	});
	const output = new (optionDefinitions.isGrouped() ? GroupedOutput : Output)(optionDefinitions);
	for (const argInfo of parser) {
		const arg = argInfo.subArg || argInfo.arg;
		if (!options.partial) {
			if (argInfo.event === "unknown_value") {
				const err = /* @__PURE__ */ new Error(`Unknown value: ${arg}`);
				err.name = "UNKNOWN_VALUE";
				err.value = arg;
				throw err;
			} else if (argInfo.event === "unknown_option") {
				const err = /* @__PURE__ */ new Error(`Unknown option: ${arg}`);
				err.name = "UNKNOWN_OPTION";
				err.optionName = arg;
				throw err;
			}
		}
		let option;
		if (output.has(argInfo.name)) option = output.get(argInfo.name);
		else {
			option = Option.create(argInfo.def);
			output.set(argInfo.name, option);
		}
		if (argInfo.name === "_unknown") option.set(arg);
		else option.set(argInfo.value);
	}
	return output.toObject({
		skipUnknown: !options.partial,
		camelCase: options.camelCase
	});
}
//#endregion
//#region scripts/config.ts
var import_src = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	const path$1 = __require("path");
	const fs = __require("fs");
	const os = __require("os");
	const url = __require("url");
	const fsReadFileAsync = fs.promises.readFile;
	/** @type {(name: string, sync: boolean) => string[]} */
	function getDefaultSearchPlaces(name, sync) {
		return [
			"package.json",
			`.${name}rc.json`,
			`.${name}rc.js`,
			`.${name}rc.cjs`,
			...sync ? [] : [`.${name}rc.mjs`],
			`.config/${name}rc`,
			`.config/${name}rc.json`,
			`.config/${name}rc.js`,
			`.config/${name}rc.cjs`,
			...sync ? [] : [`.config/${name}rc.mjs`],
			`${name}.config.js`,
			`${name}.config.cjs`,
			...sync ? [] : [`${name}.config.mjs`]
		];
	}
	/**
	* @type {(p: string) => string}
	*
	* see #17
	* On *nix, if cwd is not under homedir,
	* the last path will be '', ('/build' -> '')
	* but it should be '/' actually.
	* And on Windows, this will never happen. ('C:\build' -> 'C:')
	*/
	function parentDir(p) {
		return path$1.dirname(p) || path$1.sep;
	}
	/** @type {import('./index').LoaderSync} */
	const jsonLoader = (_, content) => JSON.parse(content);
	const requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
	/** @type {import('./index').LoadersSync} */
	const defaultLoadersSync = Object.freeze({
		".js": requireFunc,
		".json": requireFunc,
		".cjs": requireFunc,
		noExt: jsonLoader
	});
	module.exports.defaultLoadersSync = defaultLoadersSync;
	/** @type {import('./index').Loader} */
	const dynamicImport = async (id) => {
		try {
			return (await import(
				/* webpackIgnore: true */
				url.pathToFileURL(id).href
)).default;
		} catch (e) {
			try {
				return requireFunc(id);
			} catch (requireE) {
				if (requireE.code === "ERR_REQUIRE_ESM" || requireE instanceof SyntaxError && requireE.toString().includes("Cannot use import statement outside a module")) throw e;
				throw requireE;
			}
		}
	};
	/** @type {import('./index').Loaders} */
	const defaultLoaders = Object.freeze({
		".js": dynamicImport,
		".mjs": dynamicImport,
		".cjs": dynamicImport,
		".json": jsonLoader,
		noExt: jsonLoader
	});
	module.exports.defaultLoaders = defaultLoaders;
	/**
	* @param {string} name
	* @param {import('./index').Options | import('./index').OptionsSync} options
	* @param {boolean} sync
	* @returns {Required<import('./index').Options | import('./index').OptionsSync>}
	*/
	function getOptions(name, options, sync) {
		/** @type {Required<import('./index').Options>} */
		const conf = {
			stopDir: os.homedir(),
			searchPlaces: getDefaultSearchPlaces(name, sync),
			ignoreEmptySearchPlaces: true,
			cache: true,
			transform: (x) => x,
			packageProp: [name],
			...options,
			loaders: {
				...sync ? defaultLoadersSync : defaultLoaders,
				...options.loaders
			}
		};
		conf.searchPlaces.forEach((place) => {
			const key = path$1.extname(place) || "noExt";
			const loader = conf.loaders[key];
			if (!loader) throw new Error(`Missing loader for extension "${place}"`);
			if (typeof loader !== "function") throw new Error(`Loader for extension "${place}" is not a function: Received ${typeof loader}.`);
		});
		return conf;
	}
	/** @type {(props: string | string[], obj: Record<string, any>) => unknown} */
	function getPackageProp(props, obj) {
		if (typeof props === "string" && props in obj) return obj[props];
		return (Array.isArray(props) ? props : props.split(".")).reduce((acc, prop) => acc === void 0 ? acc : acc[prop], obj) || null;
	}
	/** @param {string} filepath */
	function validateFilePath(filepath) {
		if (!filepath) throw new Error("load must pass a non-empty string");
	}
	/** @type {(loader: import('./index').Loader, ext: string) => void} */
	function validateLoader(loader, ext) {
		if (!loader) throw new Error(`No loader specified for extension "${ext}"`);
		if (typeof loader !== "function") throw new Error("loader is not a function");
	}
	/** @type {(enableCache: boolean) => <T>(c: Map<string, T>, filepath: string, res: T) => T} */
	const makeEmplace = (enableCache) => (c, filepath, res) => {
		if (enableCache) c.set(filepath, res);
		return res;
	};
	/** @type {import('./index').lilconfig} */
	module.exports.lilconfig = function lilconfig(name, options) {
		const { ignoreEmptySearchPlaces, loaders, packageProp, searchPlaces, stopDir, transform, cache } = getOptions(name, options ?? {}, false);
		const searchCache = /* @__PURE__ */ new Map();
		const loadCache = /* @__PURE__ */ new Map();
		const emplace = makeEmplace(cache);
		return {
			async search(searchFrom = process.cwd()) {
				/** @type {import('./index').LilconfigResult} */
				const result = {
					config: null,
					filepath: ""
				};
				/** @type {Set<string>} */
				const visited = /* @__PURE__ */ new Set();
				let dir = searchFrom;
				dirLoop: while (true) {
					if (cache) {
						const r = searchCache.get(dir);
						if (r !== void 0) {
							for (const p of visited) searchCache.set(p, r);
							return r;
						}
						visited.add(dir);
					}
					for (const searchPlace of searchPlaces) {
						const filepath = path$1.join(dir, searchPlace);
						try {
							await fs.promises.access(filepath);
						} catch {
							continue;
						}
						const content = String(await fsReadFileAsync(filepath));
						const loaderKey = path$1.extname(searchPlace) || "noExt";
						const loader = loaders[loaderKey];
						if (searchPlace === "package.json") {
							const maybeConfig = getPackageProp(packageProp, await loader(filepath, content));
							if (maybeConfig != null) {
								result.config = maybeConfig;
								result.filepath = filepath;
								break dirLoop;
							}
							continue;
						}
						const isEmpty = content.trim() === "";
						if (isEmpty && ignoreEmptySearchPlaces) continue;
						if (isEmpty) {
							result.isEmpty = true;
							result.config = void 0;
						} else {
							validateLoader(loader, loaderKey);
							result.config = await loader(filepath, content);
						}
						result.filepath = filepath;
						break dirLoop;
					}
					if (dir === stopDir || dir === parentDir(dir)) break dirLoop;
					dir = parentDir(dir);
				}
				const transformed = result.filepath === "" && result.config === null ? transform(null) : transform(result);
				if (cache) for (const p of visited) searchCache.set(p, transformed);
				return transformed;
			},
			async load(filepath) {
				validateFilePath(filepath);
				const absPath = path$1.resolve(process.cwd(), filepath);
				if (cache && loadCache.has(absPath)) return loadCache.get(absPath);
				const { base, ext } = path$1.parse(absPath);
				const loaderKey = ext || "noExt";
				const loader = loaders[loaderKey];
				validateLoader(loader, loaderKey);
				const content = String(await fsReadFileAsync(absPath));
				if (base === "package.json") return emplace(loadCache, absPath, transform({
					config: getPackageProp(packageProp, await loader(absPath, content)),
					filepath: absPath
				}));
				/** @type {import('./index').LilconfigResult} */
				const result = {
					config: null,
					filepath: absPath
				};
				const isEmpty = content.trim() === "";
				if (isEmpty && ignoreEmptySearchPlaces) return emplace(loadCache, absPath, transform({
					config: void 0,
					filepath: absPath,
					isEmpty: true
				}));
				result.config = isEmpty ? void 0 : await loader(absPath, content);
				return emplace(loadCache, absPath, transform(isEmpty ? {
					...result,
					isEmpty,
					config: void 0
				} : result));
			},
			clearLoadCache() {
				if (cache) loadCache.clear();
			},
			clearSearchCache() {
				if (cache) searchCache.clear();
			},
			clearCaches() {
				if (cache) {
					loadCache.clear();
					searchCache.clear();
				}
			}
		};
	};
	/** @type {import('./index').lilconfigSync} */
	module.exports.lilconfigSync = function lilconfigSync(name, options) {
		const { ignoreEmptySearchPlaces, loaders, packageProp, searchPlaces, stopDir, transform, cache } = getOptions(name, options ?? {}, true);
		const searchCache = /* @__PURE__ */ new Map();
		const loadCache = /* @__PURE__ */ new Map();
		const emplace = makeEmplace(cache);
		return {
			search(searchFrom = process.cwd()) {
				/** @type {import('./index').LilconfigResult} */
				const result = {
					config: null,
					filepath: ""
				};
				/** @type {Set<string>} */
				const visited = /* @__PURE__ */ new Set();
				let dir = searchFrom;
				dirLoop: while (true) {
					if (cache) {
						const r = searchCache.get(dir);
						if (r !== void 0) {
							for (const p of visited) searchCache.set(p, r);
							return r;
						}
						visited.add(dir);
					}
					for (const searchPlace of searchPlaces) {
						const filepath = path$1.join(dir, searchPlace);
						try {
							fs.accessSync(filepath);
						} catch {
							continue;
						}
						const loaderKey = path$1.extname(searchPlace) || "noExt";
						const loader = loaders[loaderKey];
						const content = String(fs.readFileSync(filepath));
						if (searchPlace === "package.json") {
							const maybeConfig = getPackageProp(packageProp, loader(filepath, content));
							if (maybeConfig != null) {
								result.config = maybeConfig;
								result.filepath = filepath;
								break dirLoop;
							}
							continue;
						}
						const isEmpty = content.trim() === "";
						if (isEmpty && ignoreEmptySearchPlaces) continue;
						if (isEmpty) {
							result.isEmpty = true;
							result.config = void 0;
						} else {
							validateLoader(loader, loaderKey);
							result.config = loader(filepath, content);
						}
						result.filepath = filepath;
						break dirLoop;
					}
					if (dir === stopDir || dir === parentDir(dir)) break dirLoop;
					dir = parentDir(dir);
				}
				const transformed = result.filepath === "" && result.config === null ? transform(null) : transform(result);
				if (cache) for (const p of visited) searchCache.set(p, transformed);
				return transformed;
			},
			load(filepath) {
				validateFilePath(filepath);
				const absPath = path$1.resolve(process.cwd(), filepath);
				if (cache && loadCache.has(absPath)) return loadCache.get(absPath);
				const { base, ext } = path$1.parse(absPath);
				const loaderKey = ext || "noExt";
				const loader = loaders[loaderKey];
				validateLoader(loader, loaderKey);
				const content = String(fs.readFileSync(absPath));
				if (base === "package.json") return transform({
					config: getPackageProp(packageProp, loader(absPath, content)),
					filepath: absPath
				});
				const result = {
					config: null,
					filepath: absPath
				};
				const isEmpty = content.trim() === "";
				if (isEmpty && ignoreEmptySearchPlaces) return emplace(loadCache, absPath, transform({
					filepath: absPath,
					config: void 0,
					isEmpty: true
				}));
				result.config = isEmpty ? void 0 : loader(absPath, content);
				return emplace(loadCache, absPath, transform(isEmpty ? {
					...result,
					isEmpty,
					config: void 0
				} : result));
			},
			clearLoadCache() {
				if (cache) loadCache.clear();
			},
			clearSearchCache() {
				if (cache) searchCache.clear();
			},
			clearCaches() {
				if (cache) {
					loadCache.clear();
					searchCache.clear();
				}
			}
		};
	};
})))();
const loadConfig = async (cliArgs) => {
	const configSearcher = (0, import_src.lilconfig)("gettext", { searchPlaces: [
		"gettext.config.js",
		"gettext.config.cjs",
		"gettext.config.mjs",
		"package.json"
	] });
	let configRes;
	if (cliArgs?.config) {
		configRes = await configSearcher.load(cliArgs.config);
		if (!configRes) throw new Error(`Config not found: ${cliArgs.config}`);
	} else configRes = await configSearcher.search();
	const config = configRes?.config ?? {};
	const languagePath = config.output?.path || "./src/language";
	const joinPath = (inputPath) => path.join(languagePath, inputPath);
	const joinPathIfRelative = (inputPath) => {
		if (!inputPath) return;
		return path.isAbsolute(inputPath) ? inputPath : path.join(languagePath, inputPath);
	};
	return {
		input: {
			path: config.input?.path || "./src",
			include: config.input?.include || [
				"**/*.js",
				"**/*.ts",
				"**/*.vue"
			],
			exclude: config.input?.exclude || [],
			parserOptions: config.input?.parserOptions
		},
		output: {
			path: languagePath,
			potPath: joinPathIfRelative(config.output?.potPath) || joinPath("./messages.pot"),
			jsonPath: joinPathIfRelative(config.output?.jsonPath) || (config.output?.splitJson ? joinPath("./") : joinPath("./translations.json")),
			locales: config.output?.locales || ["en"],
			flat: config.output?.flat === void 0 ? true : config.output.flat,
			linguas: config.output?.linguas === void 0 ? true : config.output.linguas,
			splitJson: config.output?.splitJson === void 0 ? false : config.output.splitJson,
			fuzzyMatching: config.output?.fuzzyMatching === void 0 ? true : config.output.fuzzyMatching,
			locations: config.output?.locations === void 0 ? true : config.output.locations
		}
	};
};
//#endregion
//#region node_modules/pofile/lib/po.js
var require_po = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function trim(string) {
		return string.replace(/^\s+|\s+$/g, "");
	}
	var PO = function() {
		this.comments = [];
		this.extractedComments = [];
		this.headers = {};
		this.headerOrder = [];
		this.items = [];
	};
	PO.prototype.save = function(filename, callback) {
		__require("fs").writeFile(filename, this.toString(), callback);
	};
	PO.prototype.toString = function() {
		var lines = [];
		if (this.comments) this.comments.forEach(function(comment) {
			lines.push(("# " + comment).trim());
		});
		if (this.extractedComments) this.extractedComments.forEach(function(comment) {
			lines.push(("#. " + comment).trim());
		});
		lines.push("msgid \"\"");
		lines.push("msgstr \"\"");
		var self = this;
		var headerOrder = [];
		this.headerOrder.forEach(function(key) {
			if (key in self.headers) headerOrder.push(key);
		});
		Object.keys(this.headers).forEach(function(key) {
			if (headerOrder.indexOf(key) === -1) headerOrder.push(key);
		});
		headerOrder.forEach(function(key) {
			lines.push("\"" + key + ": " + self.headers[key] + "\\n\"");
		});
		lines.push("");
		this.items.forEach(function(item) {
			lines.push(item.toString());
			lines.push("");
		});
		return lines.join("\n");
	};
	PO.load = function(filename, callback) {
		__require("fs").readFile(filename, "utf-8", function(err, data) {
			if (err) return callback(err);
			callback(null, PO.parse(data));
		});
	};
	PO.parse = function(data) {
		data = data.replace(/\r\n/g, "\n");
		var po = new PO();
		var sections = data.split(/\n\n/);
		var headers = [];
		while (sections[0] && (headers.length === 0 || headers[headers.length - 1].indexOf("msgid \"\"") < 0)) if (sections[0].match(/msgid\s+"[^"]/)) headers.push("msgid \"\"");
		else headers.push(sections.shift());
		headers = headers.join("\n");
		var lines = sections.join("\n").split(/\n/);
		po.headers = {
			"Project-Id-Version": "",
			"Report-Msgid-Bugs-To": "",
			"POT-Creation-Date": "",
			"PO-Revision-Date": "",
			"Last-Translator": "",
			"Language": "",
			"Language-Team": "",
			"Content-Type": "",
			"Content-Transfer-Encoding": "",
			"Plural-Forms": ""
		};
		po.headerOrder = [];
		headers.split(/\n/).reduce(function(acc, line) {
			if (acc.merge) {
				line = acc.pop().slice(0, -1) + line.slice(1);
				delete acc.merge;
			}
			if (/^".*"$/.test(line) && !/^".*\\n"$/.test(line)) acc.merge = true;
			acc.push(line);
			return acc;
		}, []).forEach(function(header) {
			if (header.match(/^#\./)) po.extractedComments.push(header.replace(/^#\.\s*/, ""));
			else if (header.match(/^#/)) po.comments.push(header.replace(/^#\s*/, ""));
			else if (header.match(/^"/)) {
				header = header.trim().replace(/^"/, "").replace(/\\n"$/, "");
				var p = header.split(/:/);
				var name = p.shift().trim();
				var value = p.join(":").trim();
				po.headers[name] = value;
				po.headerOrder.push(name);
			}
		});
		var nplurals = PO.parsePluralForms(po.headers["Plural-Forms"]).nplurals;
		var item = new PO.Item({ nplurals });
		var context = null;
		var plural = 0;
		var obsoleteCount = 0;
		var noCommentLineCount = 0;
		function finish() {
			if (item.msgid.length > 0) {
				if (obsoleteCount >= noCommentLineCount) item.obsolete = true;
				obsoleteCount = 0;
				noCommentLineCount = 0;
				po.items.push(item);
				item = new PO.Item({ nplurals });
			}
		}
		function extract(string) {
			string = trim(string);
			string = string.replace(/^[^"]*"|"$/g, "");
			string = string.replace(/\\([abtnvfr'"\\?]|([0-7]{3})|x([0-9a-fA-F]{2}))/g, function(match, esc, oct, hex) {
				if (oct) return String.fromCharCode(parseInt(oct, 8));
				if (hex) return String.fromCharCode(parseInt(hex, 16));
				switch (esc) {
					case "a": return "\x07";
					case "b": return "\b";
					case "t": return "	";
					case "n": return "\n";
					case "v": return "\v";
					case "f": return "\f";
					case "r": return "\r";
					default: return esc;
				}
			});
			return string;
		}
		while (lines.length > 0) {
			var line = trim(lines.shift());
			var lineObsolete = false;
			if (line.match(/^#\~/)) {
				line = trim(line.substring(2));
				lineObsolete = true;
			}
			if (line.match(/^#:/)) {
				finish();
				item.references.push(trim(line.replace(/^#:/, "")));
			} else if (line.match(/^#,/)) {
				finish();
				var flags = trim(line.replace(/^#,/, "")).split(",");
				for (var i = 0; i < flags.length; i++) item.flags[flags[i]] = true;
			} else if (line.match(/^#($|\s+)/)) {
				finish();
				item.comments.push(trim(line.replace(/^#($|\s+)/, "")));
			} else if (line.match(/^#\./)) {
				finish();
				item.extractedComments.push(trim(line.replace(/^#\./, "")));
			} else if (line.match(/^msgid_plural/)) {
				item.msgid_plural = extract(line);
				context = "msgid_plural";
				noCommentLineCount++;
			} else if (line.match(/^msgid/)) {
				finish();
				item.msgid = extract(line);
				context = "msgid";
				noCommentLineCount++;
			} else if (line.match(/^msgstr/)) {
				var m = line.match(/^msgstr\[(\d+)\]/);
				plural = m && m[1] ? parseInt(m[1]) : 0;
				item.msgstr[plural] = extract(line);
				context = "msgstr";
				noCommentLineCount++;
			} else if (line.match(/^msgctxt/)) {
				finish();
				item.msgctxt = extract(line);
				context = "msgctxt";
				noCommentLineCount++;
			} else if (line.length > 0) {
				noCommentLineCount++;
				if (context === "msgstr") item.msgstr[plural] += extract(line);
				else if (context === "msgid") item.msgid += extract(line);
				else if (context === "msgid_plural") item.msgid_plural += extract(line);
				else if (context === "msgctxt") item.msgctxt += extract(line);
			}
			if (lineObsolete) obsoleteCount++;
		}
		finish();
		return po;
	};
	PO.parsePluralForms = function(pluralFormsString) {
		var results = (pluralFormsString || "").split(";").reduce(function(acc, keyValueString) {
			var trimmedString = keyValueString.trim();
			var equalsIndex = trimmedString.indexOf("=");
			var key = trimmedString.substring(0, equalsIndex).trim();
			acc[key] = trimmedString.substring(equalsIndex + 1).trim();
			return acc;
		}, {});
		return {
			nplurals: results.nplurals,
			plural: results.plural
		};
	};
	PO.Item = function(options) {
		var nplurals = options && options.nplurals;
		this.msgid = "";
		this.msgctxt = null;
		this.references = [];
		this.msgid_plural = null;
		this.msgstr = [];
		this.comments = [];
		this.extractedComments = [];
		this.flags = {};
		this.obsolete = false;
		var npluralsNumber = Number(nplurals);
		this.nplurals = isNaN(npluralsNumber) ? 2 : npluralsNumber;
	};
	PO.Item.prototype.toString = function() {
		var lines = [];
		var self = this;
		var _escape = function(string) {
			string = string.replace(/[\x07\b\t\v\f\r"\\]/g, function(match) {
				switch (match) {
					case "\x07": return "\\a";
					case "\b": return "\\b";
					case "	": return "\\t";
					case "\v": return "\\v";
					case "\f": return "\\f";
					case "\r": return "\\r";
					default: return "\\" + match;
				}
			});
			return string;
		};
		var _process = function(keyword, text, i) {
			var lines = [];
			var parts = text.split(/\n/);
			var index = typeof i !== "undefined" ? "[" + i + "]" : "";
			if (parts.length > 1) {
				lines.push(keyword + index + " \"\"");
				parts.forEach(function(part) {
					lines.push("\"" + _escape(part) + "\"");
				});
			} else lines.push(keyword + index + " \"" + _escape(text) + "\"");
			return lines;
		};
		var _processLineBreak = function(keyword, text, index) {
			var processed = _process(keyword, text, index);
			for (var i = 1; i < processed.length - 1; i++) processed[i] = processed[i].slice(0, -1) + "\\n\"";
			return processed;
		};
		this.comments.forEach(function(c) {
			lines.push("# " + c);
		});
		this.extractedComments.forEach(function(c) {
			lines.push("#. " + c);
		});
		this.references.forEach(function(ref) {
			lines.push("#: " + ref);
		});
		var flags = Object.keys(this.flags).filter(function(flag) {
			return !!this.flags[flag];
		}, this);
		if (flags.length > 0) lines.push("#, " + flags.join(","));
		var mkObsolete = this.obsolete ? "#~ " : "";
		[
			"msgctxt",
			"msgid",
			"msgid_plural",
			"msgstr"
		].forEach(function(keyword) {
			var text = self[keyword];
			if (text != null) {
				var hasTranslation = false;
				if (Array.isArray(text)) hasTranslation = text.some(function(text) {
					return text;
				});
				if (Array.isArray(text) && text.length > 1) text.forEach(function(t, i) {
					var processed = _processLineBreak(keyword, t, i);
					lines = lines.concat(mkObsolete + processed.join("\n" + mkObsolete));
				});
				else if (self.msgid_plural && keyword === "msgstr" && !hasTranslation) for (var pluralIndex = 0; pluralIndex < self.nplurals; pluralIndex++) lines = lines.concat(mkObsolete + _process(keyword, "", pluralIndex));
				else {
					var index = self.msgid_plural && Array.isArray(text) ? 0 : void 0;
					text = Array.isArray(text) ? text.join() : text;
					var processed = _processLineBreak(keyword, text, index);
					lines = lines.concat(mkObsolete + processed.join("\n" + mkObsolete));
				}
			}
		});
		return lines.join("\n");
	};
	module.exports = PO;
}));
//#endregion
//#region scripts/utils.ts
function execShellCommand(cmd) {
	return new Promise((resolve) => {
		exec(cmd, { env: process.env }, (error, stdout, stderr) => {
			if (error) console.warn(error);
			resolve(stdout ? stdout : stderr);
		});
	});
}
const terminalEsc = "\x1B";
const terminalFontColorReset = "[39m";
const terminalFontColors = {
	blue: "[34;1m",
	green: "[32m",
	grey: "[37;1m"
};
function colorize(color, str) {
	return `${terminalEsc}${terminalFontColors[color]}${str}${terminalEsc}${terminalFontColorReset}`;
}
//#endregion
export { commandLineArgs as a, __toESM as c, loadConfig as i, execShellCommand as n, __commonJSMin as o, require_po as r, __reExport as s, colorize as t };
