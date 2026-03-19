// logic/accession-to-xml.js
// Converts Accession UI values into XML fragments.
// Pure, deterministic, uses the global sanitizer.

import { sanitizeXML } from "../xml/sanitize.js";   // adjust path if needed

export function accessionToXML(values) {
  const xml = [];

  /* ------------------------------
     1. Dates
  ------------------------------ */
  if (values.created) {
    xml.push(
      `<dcterms:created xsi:type="dcterms:W3CDTF">${sanitizeXML(values.created)}</dcterms:created>`
    );
  }

  if (values.modified) {
    xml.push(
      `<dcterms:modified xsi:type="dcterms:W3CDTF">${sanitizeXML(values.modified)}</dcterms:modified>`
    );
  }

  /* ------------------------------
     2. Accrual fields (URI)
  ------------------------------ */
  if (values.accrualMethod) {
    xml.push(
      `<dcterms:accrualMethod xsi:type="dcterms:URI">${sanitizeXML(values.accrualMethod)}</dcterms:accrualMethod>`
    );
  }

  if (values.accrualPeriodicity) {
    xml.push(
      `<dcterms:accrualPeriodicity xsi:type="dcterms:URI">${sanitizeXML(values.accrualPeriodicity)}</dcterms:accrualPeriodicity>`
    );
  }

  if (values.accrualPolicy) {
    xml.push(
      `<dcterms:accrualPolicy xsi:type="dcterms:URI">${sanitizeXML(values.accrualPolicy)}</dcterms:accrualPolicy>`
    );
  }

  /* ------------------------------
     3. Roles (literal name + relator URI)
  ------------------------------ */
  if (values.role && values.roleName) {
    xml.push(
      `<dcterms:contributor xsi:type="dcterms:URI" role="${sanitizeXML(values.role)}">${sanitizeXML(values.roleName)}</dcterms:contributor>`
    );
  }

  /* ------------------------------
     4. Mediator (literal or URI)
  ------------------------------ */
  if (values.mediatorValue) {
    if (values.mediatorType === "literal") {
      const lang = values.mediatorLang || "en";
      xml.push(
        `<dcterms:mediator xml:lang="${sanitizeXML(lang)}">${sanitizeXML(values.mediatorValue)}</dcterms:mediator>`
      );
    } else {
      xml.push(
        `<dcterms:mediator xsi:type="dcterms:URI">${sanitizeXML(values.mediatorValue)}</dcterms:mediator>`
      );
    }
  }

  /* ------------------------------
     5. Accession Record (relation URI)
  ------------------------------ */
  if (values.relationURI) {
    xml.push(
      `<dcterms:relation xsi:type="dcterms:URI">${sanitizeXML(values.relationURI)}</dcterms:relation>`
    );
  }

  return xml.join("\n");
}
