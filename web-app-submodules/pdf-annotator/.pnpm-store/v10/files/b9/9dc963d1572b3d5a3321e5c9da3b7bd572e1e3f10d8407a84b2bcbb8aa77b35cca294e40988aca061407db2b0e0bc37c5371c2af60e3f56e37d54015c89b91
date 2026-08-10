import { createRequire } from "node:module";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
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
export { __require as a, __reExport as i, __commonJSMin as n, __toESM as o, __exportAll as r, require_po as t };
