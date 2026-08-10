import { computed, inject, reactive, ref } from "vue";
import PO from "pofile";
//#region src/interpolate.ts
const EVALUATION_RE = /[[\].]{1,2}/g;
const INTERPOLATION_RE = /%\{((?:.|\n)+?)\}/g;
const MUSTACHE_SYNTAX_RE = /\{\{((?:.|\n)+?)\}\}/g;
const interpolate = (plugin) => (msgid, context = {}, parent) => {
	if (!plugin.silent && MUSTACHE_SYNTAX_RE.test(msgid)) console.warn(`Mustache syntax cannot be used with vue-gettext. Please use "%{}" instead of "{{}}" in: ${msgid}`);
	return msgid.replace(INTERPOLATION_RE, (_match, token) => {
		const expression = token.trim();
		let evaluated;
		function getProps(obj, expression) {
			const arr = expression.split(EVALUATION_RE).filter((x) => x);
			while (arr.length) obj = obj[arr.shift()];
			return obj;
		}
		function evalInContext(context, expression, parent) {
			try {
				evaluated = getProps(context, expression);
			} catch {}
			if (evaluated === void 0 || evaluated === null) if (parent) return evalInContext(parent.ctx, expression, parent.parent);
			else {
				console.warn(`Cannot evaluate expression: ${expression}`);
				evaluated = expression;
			}
			return evaluated.toString();
		}
		return evalInContext(context, expression, parent);
	});
};
interpolate.INTERPOLATION_RE = INTERPOLATION_RE;
interpolate.INTERPOLATION_PREFIX = "%{";
//#endregion
//#region src/plurals.ts
/**
* Plural Forms
*
* This is a list of the plural forms, as used by Gettext PO, that are appropriate to each language.
* http://docs.translatehouse.org/projects/localization-guide/en/latest/l10n/pluralforms.html
*
* This is a replica of angular-gettext's plural.js
* https://github.com/rubenv/angular-gettext/blob/master/src/plural.js
*/
var plurals_default = { getTranslationIndex: function(languageCode, n) {
	n = Number(n);
	n = typeof n === "number" && isNaN(n) ? 1 : n;
	if (languageCode.length > 2 && languageCode !== "pt_BR") languageCode = languageCode.split("_")[0];
	switch (languageCode) {
		case "ay":
		case "bo":
		case "cgg":
		case "dz":
		case "fa":
		case "id":
		case "ja":
		case "jbo":
		case "ka":
		case "kk":
		case "km":
		case "ko":
		case "ky":
		case "lo":
		case "ms":
		case "my":
		case "sah":
		case "su":
		case "th":
		case "tt":
		case "ug":
		case "vi":
		case "wo":
		case "zh": return 0;
		case "is": return n % 10 !== 1 || n % 100 === 11 ? 1 : 0;
		case "jv": return n !== 0 ? 1 : 0;
		case "mk": return n === 1 || n % 10 === 1 ? 0 : 1;
		case "ach":
		case "ak":
		case "am":
		case "arn":
		case "br":
		case "fil":
		case "fr":
		case "gun":
		case "ln":
		case "mfe":
		case "mg":
		case "mi":
		case "oc":
		case "pt_BR":
		case "tg":
		case "ti":
		case "tr":
		case "uz":
		case "wa": return n > 1 ? 1 : 0;
		case "lv": return n % 10 === 1 && n % 100 !== 11 ? 0 : n !== 0 ? 1 : 2;
		case "lt": return n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
		case "be":
		case "bs":
		case "hr":
		case "ru":
		case "sr":
		case "uk": return n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
		case "mnk": return n === 0 ? 0 : n === 1 ? 1 : 2;
		case "ro": return n === 1 ? 0 : n === 0 || n % 100 > 0 && n % 100 < 20 ? 1 : 2;
		case "pl": return n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
		case "cs":
		case "sk": return n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2;
		case "csb": return n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
		case "sl": return n % 100 === 1 ? 0 : n % 100 === 2 ? 1 : n % 100 === 3 || n % 100 === 4 ? 2 : 3;
		case "mt": return n === 1 ? 0 : n === 0 || n % 100 > 1 && n % 100 < 11 ? 1 : n % 100 > 10 && n % 100 < 20 ? 2 : 3;
		case "gd": return n === 1 || n === 11 ? 0 : n === 2 || n === 12 ? 1 : n > 2 && n < 20 ? 2 : 3;
		case "cy": return n === 1 ? 0 : n === 2 ? 1 : n !== 8 && n !== 11 ? 2 : 3;
		case "kw": return n === 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : 3;
		case "ga": return n === 1 ? 0 : n === 2 ? 1 : n > 2 && n < 7 ? 2 : n > 6 && n < 11 ? 3 : 4;
		case "ar": return n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n % 100 >= 3 && n % 100 <= 10 ? 3 : n % 100 >= 11 ? 4 : 5;
		default: return n !== 1 ? 1 : 0;
	}
} };
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
//#region src/translate.ts
const translate = (language) => ({
	getTranslation: function(msgid, n = 1, context = null, defaultPlural = null, languageKey, args) {
		if (languageKey === void 0) languageKey = language.current;
		const interp = (message, parameters) => parameters ? language.interpolate(message, parameters) : message;
		msgid = normalizeMsgId(msgid);
		defaultPlural = defaultPlural ? normalizeMsgId(defaultPlural) : null;
		if (!msgid) return "";
		const silent = languageKey ? language.silent || language.muted.indexOf(languageKey) !== -1 : false;
		let noTransLangKey = "en";
		if (language.sourceCodeLanguage) noTransLangKey = language.sourceCodeLanguage;
		const untranslated = defaultPlural && plurals_default.getTranslationIndex(noTransLangKey, n) > 0 ? defaultPlural : msgid;
		const pluginTranslations = language.translations;
		const translations = pluginTranslations[languageKey] || pluginTranslations[languageKey.split("_")[0]];
		if (!translations) {
			if (!silent) console.warn(`No translations found for ${languageKey}`);
			return interp(untranslated, args);
		}
		const getTranslationFromArray = (arr) => {
			let translationIndex = plurals_default.getTranslationIndex(languageKey, n);
			if (arr.length === 1 && n === 1) translationIndex = 0;
			const str = arr[translationIndex];
			if (!str) {
				if (str === "") return interp(untranslated, args);
				throw new Error(msgid + " " + translationIndex + " " + language.current + " " + n);
			}
			return interp(str, args);
		};
		const getUntranslatedMsg = () => {
			if (!silent) {
				let msg = `Untranslated ${languageKey} key found: ${msgid}`;
				if (context) msg += ` (with context: ${context})`;
				console.warn(msg);
			}
			return interp(untranslated, args);
		};
		const translateMsg = (msg, context = null) => {
			if (msg instanceof Object) {
				if (Array.isArray(msg)) return getTranslationFromArray(msg);
				const ctxVal = msg[context ?? ""];
				return translateMsg(ctxVal);
			}
			if (context) return getUntranslatedMsg();
			if (!msg) return getUntranslatedMsg();
			return interp(msg, args);
		};
		const translated = translations[msgid];
		return translateMsg(translated, context);
	},
	gettext: function(msgid, parameters) {
		return this.getTranslation(msgid, void 0, void 0, void 0, void 0, parameters);
	},
	pgettext: function(context, msgid, parameters) {
		return this.getTranslation(msgid, 1, context, void 0, void 0, parameters);
	},
	ngettext: function(msgid, plural, n, parameters) {
		return this.getTranslation(msgid, n, null, plural, void 0, parameters);
	},
	npgettext: function(context, msgid, plural, n, parameters) {
		return this.getTranslation(msgid, n, context, plural, void 0, parameters);
	}
});
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
		if (stringArgs.length) {
			const info = getMsgInfo(mapping, keyword, charIndex, stringArgs);
			if (info) msgs.push(info);
		}
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
	if (mapping.ctx?.includes(keyword)) {
		if (!stringArgs[1]) return null;
		return {
			context: stringArgs[0],
			message: stringArgs[1],
			idx: charIdx
		};
	}
	if (mapping.ctxPlural?.includes(keyword)) {
		if (!stringArgs[1]) return null;
		return {
			context: stringArgs[0],
			message: stringArgs[1],
			messagePlural: stringArgs[2],
			idx: charIdx
		};
	}
	throw new Error(`no mapping found for keyword "${keyword}", please report this error`);
}
function getKeywords(keywords, overrideDefaults = false) {
	if (overrideDefaults) {
		if (!keywords) throw new Error(`overrideDefaults is enabled but no keywords provided in config`);
		return keywords;
	}
	return {
		simple: ["$gettext", ...keywords?.simple ? keywords.simple : []],
		plural: ["$ngettext", ...keywords?.plural ? keywords.plural : []],
		ctxPlural: ["$npgettext", ...keywords?.ctxPlural ? keywords.ctxPlural : []],
		ctx: ["$pgettext", ...keywords?.ctx ? keywords.ctx : []]
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
	const po = new PO();
	for (const msg of msgs) {
		const item = new PO.Item();
		item.msgid = msg.message;
		item.msgid_plural = msg.messagePlural;
		item.msgctxt = msg.context;
		item.references = [`${fileName}:${msg.lineNumber}`];
		po.items.push(item);
	}
	return po;
}
//#endregion
//#region src/index.ts
const defaultOptions = {
	/** all the available languages of your application. Keys must match locale names */
	availableLanguages: { en: "English" },
	defaultLanguage: "en",
	sourceCodeLanguage: void 0,
	mutedLanguages: [],
	silent: false,
	translations: {},
	setGlobalProperties: true,
	globalProperties: {
		language: ["$language"],
		gettext: ["$gettext"],
		pgettext: ["$pgettext"],
		ngettext: ["$ngettext"],
		npgettext: ["$npgettext"],
		interpolate: ["$gettextInterpolate"]
	}
};
function createGettext(options = {}) {
	Object.keys(options).forEach((key) => {
		if (Object.keys(defaultOptions).indexOf(key) === -1) throw new Error(`${key} is an invalid option for the translate plugin.`);
	});
	const mergedOptions = {
		...defaultOptions,
		...options
	};
	const translations = ref(normalizeTranslations(mergedOptions.translations));
	const gettext = reactive({
		available: mergedOptions.availableLanguages,
		muted: mergedOptions.mutedLanguages,
		silent: mergedOptions.silent,
		translations: computed({
			get: () => {
				return translations.value;
			},
			set: (val) => {
				translations.value = normalizeTranslations(val);
			}
		}),
		current: mergedOptions.defaultLanguage,
		sourceCodeLanguage: mergedOptions.sourceCodeLanguage,
		install(app) {
			app[GetTextSymbol] = gettext;
			app.provide(GetTextSymbol, gettext);
			if (mergedOptions.setGlobalProperties) {
				const globalProperties = app.config.globalProperties;
				let properties = mergedOptions.globalProperties.gettext || ["$gettext"];
				properties.forEach((p) => {
					globalProperties[p] = gettext.$gettext;
				});
				properties = mergedOptions.globalProperties.pgettext || ["$pgettext"];
				properties.forEach((p) => {
					globalProperties[p] = gettext.$pgettext;
				});
				properties = mergedOptions.globalProperties.ngettext || ["$ngettext"];
				properties.forEach((p) => {
					globalProperties[p] = gettext.$ngettext;
				});
				properties = mergedOptions.globalProperties.npgettext || ["$npgettext"];
				properties.forEach((p) => {
					globalProperties[p] = gettext.$npgettext;
				});
				properties = mergedOptions.globalProperties.language || ["$language"];
				properties.forEach((p) => {
					globalProperties[p] = gettext;
				});
			}
		}
	});
	const translate$1 = translate(gettext);
	const interpolate$1 = interpolate(gettext);
	gettext.$gettext = translate$1.gettext.bind(translate$1);
	gettext.$pgettext = translate$1.pgettext.bind(translate$1);
	gettext.$ngettext = translate$1.ngettext.bind(translate$1);
	gettext.$npgettext = translate$1.npgettext.bind(translate$1);
	gettext.interpolate = interpolate$1.bind(interpolate$1);
	return gettext;
}
const defineGettextConfig = (config) => {
	return config;
};
//#endregion
export { createGettext, defineGettextConfig, makePO, parseSrc, tokenize, useGettext };
