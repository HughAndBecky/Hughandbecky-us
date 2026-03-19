// logic/build-xml.js
// Central XML builder for Hughslist.
// Pure, deterministic, no DOM access except through section modules.

// Title (single-file)
import { getTitleXMLValues, titleToXML } from "./title.js";

// Description (split-file)
import { getDescriptionXMLValues } from "./description.js";
import { descriptionToXML } from "./description-to-xml.js";

// Matrix (single-file)
import { getMatrixXMLValues, matrixToXML } from "./matrix.js";

// Accession (split-file)
import { getAccessionXMLValues } from "./accession.js";
import { accessionToXML } from "./accession-to-xml.js";

import { validateRecord } from "./validator.js";
// NEW

export function buildXML() {

  // -----------------------------------------
  // 1. Collect ALL values from ALL sections
  // -----------------------------------------
  const values = {
    ...getTitleXMLValues(),
    ...getDescriptionXMLValues(),
    ...getMatrixXMLValues(),
    ...getAccessionXMLValues()
  };

  // -----------------------------------------
  // 2. Validate the entire record
  // -----------------------------------------
  const { errors, warnings } = validateRecord(values);

  // If there are validation errors, do NOT build XML
  //if (errors.length > 0) {
  //  return { xml: "", errors, warnings };
  //}
  // Option C: Do NOT block XML output.
  // We still return errors/warnings, but XML is always built.

  // -----------------------------------------
  // 3. Build XML sections
  // -----------------------------------------
  const parts = [];

  parts.push(titleToXML(values));
  parts.push(descriptionToXML(values));
  parts.push(matrixToXML(values));
  parts.push(accessionToXML(values));

  const xml = parts
    .filter(Boolean)
    .join("\n")
    .trim();

  // -----------------------------------------
  // 4. Return structured result
  // -----------------------------------------
  return { xml, errors, warnings };
}
