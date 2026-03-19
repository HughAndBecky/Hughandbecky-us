// logic/description-to-xml.js
import { sanitizeXML } from "../xml/sanitize.js";

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
