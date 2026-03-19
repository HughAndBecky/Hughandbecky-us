// logic/description.js
// logic/description.js
// Modernized Description module — UI-only + pure XML builder

import { sanitizeXML } from "../xml/sanitize.js";
import { attachValidation } from "../ui/validation-attach.js";
import { getTranslations } from "../i18n/loader.js";

/* -------------------------------------------------------
   1. VALUE EXTRACTION (pure, no DOM mutation)
------------------------------------------------------- */

export function getDescriptionXMLValues() {
  const get = id => document.getElementById(id)?.value.trim() || "";

  return {
    description:     get("collection-description"),
    descriptionLang: get("collection-description-lang"),

    provenance:      get("collection-provenance"),
    provenanceLang:  get("collection-provenance-lang"),

    provenanceURI:   get("collection-provenance-uri"),

    abstract:        get("collection-abstract"),
    abstractLang:    get("collection-abstract-lang")
  };
}

/* -------------------------------------------------------
   2. XML BUILDER (pure, deterministic)
------------------------------------------------------- */

export function descriptionToXML(values) {
  const xml = [];

  if (values.description) {
    xml.push(
      `<dcterms:description xml:lang="${values.descriptionLang || "en"}">${sanitizeXML(values.description)}</dcterms:description>`
    );
  }

  if (values.provenance) {
    xml.push(
      `<dcterms:provenance xml:lang="${values.provenanceLang || "en"}">${sanitizeXML(values.provenance)}</dcterms:provenance>`
    );
  }

  if (values.provenanceURI) {
    xml.push(
      `<dcterms:provenance xsi:type="dcterms:URI">${sanitizeXML(values.provenanceURI)}</dcterms:provenance>`
    );
  }

  if (values.abstract) {
    xml.push(
      `<dcterms:abstract xml:lang="${values.abstractLang || "en"}">${sanitizeXML(values.abstract)}</dcterms:abstract>`
    );
  }

  return xml.join("\n");
}

/* -------------------------------------------------------
   3. UI INITIALIZATION (no XML writing)
------------------------------------------------------- */

export function initDescriptionSection() {
  const fields = [
    "collection-description",
    "collection-description-lang",
    "collection-provenance",
    "collection-provenance-lang",
    "collection-provenance-uri",
    "collection-abstract",
    "collection-abstract-lang"
  ];

  // Attach validation + input listeners
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    attachValidation(id);

    el.addEventListener("input", () => {
      // No XML writing here — build-xml.js handles dynamic updates
    });

    // Help system hook
    el.addEventListener("focusin", () => {
      const translations = getTranslations();
      const helpKey = el.dataset.helpKey;
      const helpText =
        translations[helpKey] ||
        "Provide descriptive information about the collection.";
      document.getElementById("help-content").textContent = helpText;
    });
  });
}
