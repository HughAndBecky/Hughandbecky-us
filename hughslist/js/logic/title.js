// logic/title.js
import { sanitizeXML } from "../xml/sanitize.js";
import { attachValidation } from "../ui/validation-attach.js";
import { getTranslations } from "../i18n/loader.js";

/* -------------------------------------------------------
   XML BUILDERS (pure functions)
------------------------------------------------------- */

function makeMainTitle(value, lang) {
  if (!value) return "";
  const isURI = value.startsWith("http://") || value.startsWith("https://");

  if (isURI) {
    return `<dcterms:title xsi:type="dcterms:URI">${sanitizeXML(value)}</dcterms:title>`;
  }

  const langAttr = lang ? ` xml:lang="${lang}"` : "";
  return `<dc:title${langAttr}>${sanitizeXML(value)}</dc:title>`;
}

function makeAltTitle(value, lang) {
  if (!value) return "";
  const isURI = value.startsWith("http://") || value.startsWith("https://");

  if (isURI) {
    return `<dcterms:alternative xsi:type="dcterms:URI">${sanitizeXML(value)}</dcterms:alternative>`;
  }

  const langAttr = lang ? ` xml:lang="${lang}"` : "";
  return `<dcterms:alternative${langAttr}>${sanitizeXML(value)}</dcterms:alternative>`;
}

/* -------------------------------------------------------
   NEW ARCHITECTURE: getTitleXMLValues()
   (NO DOM mutation, NO XML writing)
------------------------------------------------------- */

export function getTitleXMLValues() {
  const get = id => document.getElementById(id)?.value.trim() || "";

  const mainTitle = get("collection-title");
  const mainLang = get("collection-title-lang");

  const altTitles = [...document.querySelectorAll(".alt-title-block")].map(block => ({
    value: block.querySelector(".alt-title-input")?.value.trim() || "",
    lang: block.querySelector(".alt-title-lang-input")?.value.trim() || ""
  }));

  return {
    title: mainTitle,
    titleLang: mainLang,
    altTitles
  };
}

/* -------------------------------------------------------
   NEW ARCHITECTURE: titleToXML(values)
   (pure, deterministic)
------------------------------------------------------- */

export function titleToXML(values) {
  const xml = [];

  // Main title
  if (values.title) {
    xml.push(makeMainTitle(values.title, values.titleLang));
  }

  // Alternative titles
  if (values.altTitles && values.altTitles.length > 0) {
    values.altTitles.forEach(t => {
      if (t.value) xml.push(makeAltTitle(t.value, t.lang));
    });
  }

  return xml.join("\n");
}

/* -------------------------------------------------------
   UI: Repeatable Alternative Title Blocks (semantic IDs)
------------------------------------------------------- */

let altTitleIndex = 0;

function addAltTitleBlock() {
  const container = document.getElementById("alt-title-container");
  const template = document.getElementById("alt-title-template");

  const clone = template.content.cloneNode(true);
  const block = clone.querySelector(".alt-title-block");

  const index = altTitleIndex++;

  // ------------------------------
  // Title input + label
  // ------------------------------
  const titleInput = block.querySelector(".alt-title-input");
  const titleLabel = block.querySelector("label[data-i18n='label.alt_title']");
  const titleId = `alt-title-${index}`;

  titleInput.id = titleId;
  titleLabel.setAttribute("for", titleId);

  // ------------------------------
  // Language input + label
  // ------------------------------
  const langInput = block.querySelector(".alt-title-lang-input");
  const langLabel = block.querySelector("label[data-i18n='label.alt_title_lang']");
  const langId = `alt-title-lang-${index}`;

  langInput.id = langId;
  langLabel.setAttribute("for", langId);

  // ------------------------------
  // Validation hooks
  // ------------------------------
  attachValidation(titleId);
  attachValidation(langId);

  // ------------------------------
  // Remove button
  // ------------------------------
  const removeBtn = block.querySelector(".remove-alt-title");
  removeBtn.addEventListener("click", () => block.remove());

  // ------------------------------
  // Help system
  // ------------------------------
  block.addEventListener("focusin", () => {
    const helpKey = block.dataset.helpKey;
    const translations = getTranslations();
    const helpText =
      translations[helpKey] ||
      "Alternative titles are additional names for the collection.";
    document.getElementById("help-content").textContent = helpText;
  });

  container.appendChild(clone);
}


/* -------------------------------------------------------
   UI INITIALIZATION
------------------------------------------------------- */

export function initTitleSection() {
  // Main title listeners
  ["collection-title", "collection-title-lang"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => {});
  });

  // Add button for alternative titles
  const addBtn = document.getElementById("add-alt-title");
  addBtn.addEventListener("click", () => addAltTitleBlock());

  // Start with one empty alt-title block
  addAltTitleBlock();
}
