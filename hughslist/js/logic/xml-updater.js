// logic/xml-updater.js
import { buildXML } from "./build-xml.js";

export function initGlobalXMLUpdater() {
  const output = document.getElementById("output");

  function update() {
    const { xml } = buildXML();
    output.value = xml;
  }

  // Listen for ANY input or change event in the document
  document.addEventListener("input", update);
  document.addEventListener("change", update);

  // Build once on load
  update();
}
