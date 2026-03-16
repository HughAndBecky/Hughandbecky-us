// ui/ui-language-selector.js

import { loadLanguage } from "../i18n/loader.js";

/**
 * Centralized list of supported interface languages.
 */
export const UI_LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "hi",    label: "हिन्दी" },
  { value: "th",    label: "ไทย (Thai)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "fr",    label: "Français" },
  { value: "it",    label: "Italiano" },
  { value: "de-DE", label: "Deutsch" },
  { value: "ru",    label: "Русский" },
  { value: "uk",    label: "Українська" },
  { value: "id",    label: "Bahasa Indonesia" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" }
];

/**
 * Initialize the interface language selector.
 */
export function initUILanguageSelector() {
  const select = document.getElementById("lang-select");
  if (!select) {
    console.warn("UI language selector: #lang-select not found.");
    return;
  }

  // Clear any inline HTML
  select.innerHTML = "";

  // Populate dynamically
  UI_LANGUAGES.forEach(lang => {
    const opt = document.createElement("option");
    opt.value = lang.value;
    opt.textContent = lang.label;
    select.appendChild(opt);
  });

  // Behavior
  select.addEventListener("change", () => {
    loadLanguage(select.value);
  });

  // Load initial language
  loadLanguage(select.value);
}
