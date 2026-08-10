#!/usr/bin/env node
import { a as commandLineArgs, c as __toESM, i as loadConfig, r as require_po, t as colorize } from "./utils-BZAQSFQ6.js";
import path from "node:path";
import fsPromises from "node:fs/promises";
import fsPromises$1 from "fs/promises";
//#region scripts/compile.ts
var import_po = /* @__PURE__ */ __toESM(require_po(), 1);
/**
* Returns a sanitized po data dictionary where:
* - no fuzzy or obsolete strings are returned
* - no empty translations are returned
*
* @param poItems items from the PO catalog
* @returns jsonData: sanitized PO data
*/
const sanitizePoData = (poItems) => {
	const messages = {};
	for (let item of poItems) {
		const ctx = item.msgctxt || "";
		if (item.msgstr[0] && item.msgstr[0].length > 0 && !item.flags.fuzzy && !item.obsolete) {
			if (!messages[item.msgid]) messages[item.msgid] = {};
			messages[item.msgid][ctx] = item.msgstr.length === 1 ? item.msgstr[0] : item.msgstr;
		}
	}
	for (let key in messages) if (Object.keys(messages[key]).length === 1 && messages[key][""]) messages[key] = messages[key][""];
	return messages;
};
const po2json = (poContent) => {
	const catalog = import_po.default.parse(poContent);
	if (!catalog.headers.Language) throw new Error("No Language headers found!");
	return {
		headers: catalog.headers,
		messages: sanitizePoData(catalog.items)
	};
};
const compilePoFiles = async (localesPaths) => {
	const translations = {};
	await Promise.all(localesPaths.map(async (lp) => {
		const data = po2json(await fsPromises$1.readFile(lp, { encoding: "utf-8" }));
		const lang = data.headers.Language;
		if (lang && !translations[lang]) translations[lang] = data.messages;
		else Object.assign(translations[data.headers.Language], data.messages);
	}));
	return translations;
};
//#endregion
//#region scripts/gettext_compile.ts
const optionDefinitions = [{
	name: "config",
	alias: "c",
	type: String
}];
let options;
try {
	options = commandLineArgs(optionDefinitions);
} catch (e) {
	console.error(e);
	process.exit(1);
}
(async () => {
	const config = await loadConfig(options);
	console.info(`Language directory: ${colorize("blue", config.output.path)}`);
	console.info(`Locales: ${colorize("blue", config.output.locales)}`);
	console.info();
	const localesPaths = config.output.locales.map((loc) => config.output.flat ? path.join(config.output.path, `${loc}.po`) : path.join(config.output.path, `${loc}/app.po`));
	await fsPromises.mkdir(config.output.path, { recursive: true });
	const jsonRes = await compilePoFiles(localesPaths);
	console.info(`${colorize("green", "Compiled json")}: ${colorize("grey", JSON.stringify(jsonRes))}`);
	console.info();
	if (config.output.splitJson) await Promise.all(config.output.locales.map(async (locale) => {
		const outputPath = path.join(config.output.jsonPath, `${locale}.json`);
		await fsPromises.writeFile(outputPath, JSON.stringify({ [locale]: jsonRes[locale] }));
		console.info(`${colorize("green", "Created")}: ${colorize("blue", outputPath)}`);
	}));
	else {
		const outputPath = config.output.jsonPath;
		await fsPromises.writeFile(outputPath, JSON.stringify(jsonRes));
		console.info(`${colorize("green", "Created")}: ${colorize("blue", outputPath)}`);
	}
})();
//#endregion
export {};
