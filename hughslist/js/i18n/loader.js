import { parsePO } from "./po-parser.js";
import { applyTranslations } from "./apply.js";

let translations = {};

export const getTranslations = () => translations;

export async function loadLanguage(lang) {
  try {
    const response = await fetch(`${lang}.po`);
    if (!response.ok) {
      translations = {};
      applyTranslations(translations);
      return;
    }
    const text = await response.text();
    translations = parsePO(text);
    applyTranslations(translations);
  } catch (e) {
    translations = {};
    applyTranslations(translations);
  }
}
