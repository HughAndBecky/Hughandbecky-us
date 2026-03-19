import { initTabs } from "./ui/tabs.js";
import { initValidation } from "./ui/validation-attach.js";

import { initTitleSection } from "./logic/title.js";
import { initDescriptionSection } from "./logic/description.js";
import { initMatrix } from "./logic/matrix.js";

import { initHelpPanel } from "./logic/help-panel.js";

import { initializeHistory } from "./ux/history.js";

// DCMIType chooser (async)
import { initDCMIChooser } from "./ui/dcmi-chooser.js";

// Accession module
import { initAccessionUI } from "./logic/accession.js";

// Interface Language Selector
import { initUILanguageSelector } from "./ui/ui-language-selector.js";

// OAI wrapper module
import { wrapRecordInOAI } from "./logic/oai-wrapper.js";

// Dynamic XML updater
import { attachDynamicXML } from "./ui/dynamic-xml.js";

// XML builder
import { buildXML } from "./logic/build-xml.js";

// Header + Footer loaders
import { loadHeader } from "./ui/header-loader.js";
import { loadFooter } from "./ui/footer-loader.js";

// 🔹 NEW: Search cards module
import { initSearchCards } from "./ui/search-cards.js";


// ------------------------------------------------------------
// PAGE-TYPE DETECTION
// ------------------------------------------------------------

// Editor pages contain #editor-content.
function isEditorPage() {
  return document.getElementById("editor-content") !== null;
}

// Search page contains #search-cards-container.
function isSearchPage() {
  return document.getElementById("search-cards-container") !== null;
}


// ------------------------------------------------------------
// SINGLE DOMContentLoaded — clean architecture
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {

  // -----------------------------------------
  // 1. Load header and footer on ALL pages
  // -----------------------------------------
  await loadHeader();
  await loadFooter();

  // -----------------------------------------
  // 2. Initialize language selector on ALL pages
  // -----------------------------------------
  initUILanguageSelector();

  // -----------------------------------------
  // 3. SEARCH PAGE INITIALIZATION
  // -----------------------------------------
  if (isSearchPage()) {
    initSearchCards();
    return; // Stop — do NOT load editor modules
  }

  // -----------------------------------------
  // 4. If this is NOT an editor page, stop here.
  // -----------------------------------------
  if (!isEditorPage()) {
    return; // Safe exit — header/footer/lang are loaded
  }

  // -----------------------------------------
  // 5. Wire dynamic XML updater (editor only)
  // -----------------------------------------
  attachDynamicXML();

  // -----------------------------------------
  // 6. Initialize UI modules (editor only)
  // -----------------------------------------
  initTabs();
  initValidation();
  initHelpPanel();

  // -----------------------------------------
  // 7. Initialize form logic modules (editor only)
  // -----------------------------------------
  initTitleSection();
  initDescriptionSection();
  initMatrix();
  initAccessionUI();

  // -----------------------------------------
  // 8. Initialize the DCMIType chooser (async)
  // -----------------------------------------
  await initDCMIChooser();

  // -----------------------------------------
  // 9. Initialize history AFTER chooser is ready
  // -----------------------------------------
  initializeHistory();

  // -----------------------------------------
  // 10. Handle DCMIType selection event
  // -----------------------------------------
  document.addEventListener("dcmiTypeSelected", (e) => {
    const type = e.detail.type;

    const chooser = document.getElementById("dcmi-chooser");
    if (chooser) chooser.hidden = true;

    const editor = document.getElementById("editor-content");
    if (editor) editor.hidden = false;

    const collectionTabs = document.getElementById("collection-tabs");
    if (collectionTabs) {
      collectionTabs.hidden = (type !== "Collection");
    }
  });

  // -----------------------------------------
  // 11. COPY XML — with optional OAI wrapping
  // -----------------------------------------
  const copyBtn = document.getElementById("copyXML");
  const wrapBox = document.getElementById("wrap-oai");

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const { xml } = buildXML();
      const wrap = wrapBox?.checked;

      let out = xml;

      if (wrap) {
        const records = xml.split("<!-- RECORD BREAK -->");
        const wrapped = records.map((r) => wrapRecordInOAI(r.trim()));
        out = wrapped.join("\n\n");
      }

      navigator.clipboard.writeText(out);
    });
  }

});
