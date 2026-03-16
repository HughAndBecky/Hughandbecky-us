import { initTabs } from "./ui/tabs.js";
import { initValidation } from "./ui/validation-attach.js";

import { initTitleSection } from "./logic/title.js";
import { initDescriptionSection } from "./logic/description.js";
import { initMatrix } from "./logic/matrix.js";

import { initHelpPanel } from "./logic/help-panel.js";

import { initializeHistory } from "./ux/history.js";

// DCMIType chooser (async)
import { initDCMIChooser } from "./ui/dcmi-chooser.js";

// NEW — Interface Language Selector
import { initUILanguageSelector } from "./ui/ui-language-selector.js";

// NEW — OAI wrapper module
import { wrapRecordInOAI } from "./logic/oai-wrapper.js";

document.addEventListener("DOMContentLoaded", async () => {

  // -----------------------------------------
  // Initialize UI modules
  // -----------------------------------------
  initTabs();
  initValidation();
  initHelpPanel();
  initUILanguageSelector();   // NEW

  // -----------------------------------------
  // Initialize form logic modules
  // -----------------------------------------
  initTitleSection();
  initDescriptionSection();
  initMatrix();

  // -----------------------------------------
  // Initialize the DCMIType chooser (async)
  // -----------------------------------------
  await initDCMIChooser();

  // -----------------------------------------
  // Initialize history AFTER chooser is ready
  // -----------------------------------------
  initializeHistory();

  // -----------------------------------------
  // Handle DCMIType selection event
  // -----------------------------------------
  document.addEventListener("dcmiTypeSelected", (e) => {
    const type = e.detail.type;

    // Hide chooser
    const chooser = document.getElementById("dcmi-chooser");
    if (chooser) chooser.hidden = true;

    // Show editor
    const editor = document.getElementById("editor-content");
    if (editor) editor.hidden = false;

    // Show/hide Collection tabs
    const collectionTabs = document.getElementById("collection-tabs");
    if (collectionTabs) {
      collectionTabs.hidden = (type !== "Collection");
    }

    // (Later: add other DCMIType-specific tab sets here)
  });

  // -----------------------------------------
  // COPY XML — with optional OAI wrapping
  // -----------------------------------------
  const copyBtn = document.getElementById("copyXML");
  const wrapBox = document.getElementById("wrap-oai");

  copyBtn.addEventListener("click", () => {
    let xml = document.getElementById("output").value;
    const wrap = wrapBox.checked;

    if (wrap) {
      // Split into individual records if needed
      // Adjust delimiter if your builder uses a different one
      const records = xml.split("<!-- RECORD BREAK -->");

      const wrapped = records.map(r =>
        wrapRecordInOAI(r.trim())
      );

      xml = wrapped.join("\n\n");
    }

    navigator.clipboard.writeText(xml);
  });

});
