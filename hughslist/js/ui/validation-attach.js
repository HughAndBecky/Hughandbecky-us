import { validateXML, validationMessages } from "../xml/validation.js";
import { getTranslations } from "../i18n/loader.js";

export function attachValidation(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const warning = document.createElement("div");
  warning.className = "xml-warning";
  warning.style.color = "red";
  warning.style.fontSize = "0.9em";
  warning.style.marginTop = "4px";
  warning.style.display = "none";

  input.insertAdjacentElement("afterend", warning);

  input.addEventListener("input", () => {
    const { valid, key } = validateXML(input.value);
    const translations = getTranslations();

    if (valid) {
      input.style.borderColor = "";
      warning.style.display = "none";
      warning.textContent = "";
    } else {
      input.style.borderColor = "red";
      warning.style.display = "block";
      warning.textContent = translations[key] || validationMessages[key] || key;
    }
  });
}

export function initValidation() {
  [
    "collection-title",
    "collection-title-alt",
    "collection-description",
    "collection-provenance",
    "collection-provenance-uri",
    "collection-abstract"
  ].forEach(attachValidation);
}
