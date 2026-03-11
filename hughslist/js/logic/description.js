import { sanitizeXML } from "../xml/sanitize.js";

function makeLiteral(tag, value, lang) {
  if (!value) return "";
  const langAttr = lang ? ` xml:lang="${lang}"` : "";
  return `<dcterms:${tag}${langAttr}>${sanitizeXML(value)}</dcterms:${tag}>\n`;
}

function makeURI(tag, value) {
  if (!value) return "";
  return `<dcterms:${tag} xsi:type="dcterms:URI">${sanitizeXML(value)}</dcterms:${tag}>\n`;
}

export function updateDescriptionFields() {
  const desc = document.getElementById('collection-description').value.trim();
  const descLang = document.getElementById('collection-description-lang').value.trim();

  const prov = document.getElementById('collection-provenance').value.trim();
  const provLang = document.getElementById('collection-provenance-lang').value.trim();

  const provURI = document.getElementById('collection-provenance-uri').value.trim();

  const abs = document.getElementById('collection-abstract').value.trim();
  const absLang = document.getElementById('collection-abstract-lang').value.trim();

  const output = document.getElementById('output');

  const lines = output.value.split("\n").filter(l =>
    !l.startsWith("<dcterms:description") &&
    !l.startsWith("<dcterms:provenance") &&
    !l.startsWith("<dcterms:abstract")
  );

  const xml =
    makeLiteral("description", desc, descLang) +
    makeLiteral("provenance", prov, provLang) +
    makeURI("provenance", provURI) +
    makeLiteral("abstract", abs, absLang);

  output.value = lines.join("\n").trim();
  if (xml.trim().length > 0) {
    output.value += (output.value ? "\n" : "") + xml;
  }
}

export function initDescriptionSection() {
  [
    "collection-description",
    "collection-description-lang",
    "collection-provenance",
    "collection-provenance-lang",
    "collection-provenance-uri",
    "collection-abstract",
    "collection-abstract-lang"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateDescriptionFields);
  });
}
