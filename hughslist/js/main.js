import { loadLanguage } from "./i18n/loader.js";
import { initTabs } from "./ui/tabs.js";
import { initValidation } from "./ui/validation-attach.js";

import { initTitleSection } from "./logic/title.js";
import { initDescriptionSection } from "./logic/description.js";
import { initMatrix } from "./logic/matrix.js";

import { initTypeTabs } from "./ui/type-tabs.js";
import { applyTypeSelection } from "./logic/type-selection.js";

import { initHelpPanel } from "./logic/help-panel.js";   // NEW

document.addEventListener("DOMContentLoaded", () => {
  // --- UI initialization ---
  initTabs();
  initValidation();
  initHelpPanel();            // NEW: collapsible help panel

  // --- Form sections ---
  initTitleSection();
  initDescriptionSection();
  initMatrix();

  // --- DCMIType dynamic tabs ---
  initTypeTabs(applyTypeSelection);

  // --- Language selector ---
  const langSelect = document.getElementById("lang-select");
  langSelect.addEventListener("change", () => {
    loadLanguage(langSelect.value);
  });
  loadLanguage(langSelect.value);
});
