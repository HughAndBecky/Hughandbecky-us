import { sanitizeXML } from "../xml/sanitize.js";
import { attachValidation } from "../ui/validation-attach.js";
import { getTranslations } from "../i18n/loader.js";

/* -------------------------------------------------------
   MAIN TITLE + ALT TITLE XML BUILDERS
------------------------------------------------------- */

function makeMainTitle(value, lang) {
  if (!value) return "";
  const isURI = value.startsWith("http://") || value.startsWith("https://");
  if (isURI) {
    return `<dcterms:title xsi:type="dcterms:URI">${sanitizeXML(value)}</dcterms:title>\n`;
  }
  const langAttr = lang ? ` xml:lang="${lang}"` : "";
  return `<dc:title${langAttr}>${sanitizeXML(value)}</dc:title>\n`;
}

function makeAltTitle(value, lang) {
  if (!value) return "";
  const isURI = value.startsWith("http://") || value.startsWith("https://");
  if (isURI) {
    return `<dcterms:alternative xsi:type="dcterms:URI">${sanitizeXML(value)}</dcterms:alternative>\n`;
  }
  const langAttr = lang ? ` xml:lang="${lang}"` : "";
  return `<dcterms:alternative${langAttr}>${sanitizeXML(value)}</dcterms:alternative>\n`;
}

/* -------------------------------------------------------
   UPDATE XML OUTPUT
------------------------------------------------------- */

export function updateTitleInOutput() {
  const output = document.getElementById("output");

  // Remove existing title + alt-title lines
  const lines = output.value.split("\n").filter(l =>
    !l.startsWith("<dc:title") &&
    !l.startsWith("<dcterms:title") &&
    !l.startsWith("<dcterms:alternative")
  );

  // Main title
  const title = document.getElementById("collection-title").value.trim();
  const titleLang = document.getElementById("collection-title-lang").value.trim();

  let xml = makeMainTitle(title, titleLang);

  // Alternative titles (repeatable)
  const blocks = document.querySelectorAll(".alt-title-block");
  blocks.forEach(block => {
    const val = block.querySelector(".alt-title-input").value.trim();
    const lang = block.querySelector(".alt-title-lang-input").value.trim();
    xml += makeAltTitle(val, lang);
  });

  // Rebuild output
  output.value = lines.join("\n").trim();
  if (xml.trim().length > 0) {
    output.value += (output.value ? "\n" : "") + xml;
  }
}

/* -------------------------------------------------------
   REPEATABLE ALT TITLE BLOCKS
------------------------------------------------------- */

function addAltTitleBlock() {
  const container = document.getElementById("alt-title-container");
  const template = document.getElementById("alt-title-template");

  const clone = template.content.cloneNode(true);
  const block = clone.querySelector(".alt-title-block");

  // Attach remove handler
  const removeBtn = block.querySelector(".remove-alt-title");
  removeBtn.addEventListener("click", () => {
    block.remove();
    updateTitleInOutput();
  });

  // Attach validation + update handlers
  const titleInput = block.querySelector(".alt-title-input");
  const langInput = block.querySelector(".alt-title-lang-input");

  attachValidationToField(titleInput);
  attachValidationToField(langInput);

  titleInput.addEventListener("input", updateTitleInOutput);
  langInput.addEventListener("input", updateTitleInOutput);

  // Help system hook (if you add one later)
  block.addEventListener("focusin", () => {
    const helpKey = block.dataset.helpKey;
    const translations = getTranslations();
    const helpText = translations[helpKey] || "Alternative titles are additional names for the collection.";
    document.getElementById("help-content").textContent = helpText;
  });

  container.appendChild(clone);
}

function attachValidationToField(input) {
  // attachValidation expects an ID, so we wrap it
  // by giving the element a temporary unique ID
  const uid = "alt-" + Math.random().toString(36).slice(2);
  input.id = uid;
  attachValidation(uid);
}

/* -------------------------------------------------------
   INITIALIZATION
------------------------------------------------------- */

export function initTitleSection() {
  // Main title listeners
  [
    "collection-title",
    "collection-title-lang"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateTitleInOutput);
  });

  // Add button for alternative titles
  const addBtn = document.getElementById("add-alt-title");
  addBtn.addEventListener("click", () => {
    addAltTitleBlock();
    updateTitleInOutput();
  });

  // Start with one empty alt-title block
  addAltTitleBlock();
}
