// ui/dynamic-xml.js
import { buildXML } from "../logic/build-xml.js";
import { wrapRecordInOAI } from "../logic/oai-wrapper.js";

export function attachDynamicXML() {
  const outputCode = document.querySelector("#output code");
  const placeholder = document.getElementById("output-placeholder");
  const wrapBox = document.getElementById("wrap-oai");

  function update() {
    const { xml } = buildXML();
    let displayXML = xml;

    // Wrap in OAI if checkbox is checked
    if (wrapBox?.checked) {
      displayXML = wrapRecordInOAI(xml.trim());
    }

    // Toggle placeholder
    placeholder.style.display = displayXML.trim() ? "none" : "block";

    // Write XML into <code>
    outputCode.textContent = displayXML;

    // Highlight + namespace tagging
    if (window.Prism) {
      Prism.highlightElement(outputCode);
      tagNamespacesForStyling(outputCode);
    }
  }

  document.addEventListener("input", update);
  document.addEventListener("change", update);

  update();
}

/* ============================================================
   NAMESPACE TAGGING FOR STYLING
   ============================================================ */

function tagNamespacesForStyling(root) {
  const namespaces = root.querySelectorAll(".token.namespace");

  namespaces.forEach((ns) => {
    const prefix = ns.textContent || "";
    const parent = ns.parentElement;

    // Helper: tag punctuation siblings
    function tagPunctuationAround(localClass) {
      // BEFORE namespace (</)
      const prev = ns.previousElementSibling;
      if (prev && prev.classList.contains("token.punctuation")) {
        prev.classList.add(localClass);
      }

      // AFTER namespace (>)
      const afterNS = ns.nextElementSibling;
      if (afterNS && afterNS.classList.contains("token.punctuation")) {
        afterNS.classList.add(localClass);
      }

      // AFTER local name (closing ">")
      const local = ns.nextElementSibling;
      const afterLocal = local?.nextElementSibling;
      if (afterLocal && afterLocal.classList.contains("token.punctuation")) {
        afterLocal.classList.add(localClass);
      }

      // ANY punctuation inside the same tag group
      const allPunct = parent.querySelectorAll(".token.punctuation");
      allPunct.forEach((p) => p.classList.add(localClass));
    }

    /* ------------------------------------------------------------
       OAI NAMESPACE
       ------------------------------------------------------------ */
    if (prefix.startsWith("oai:")) {
      ns.classList.add("oai");

      const local = ns.nextElementSibling;
      if (local && local.classList.contains("token.tag")) {
        local.classList.add("oai");
      }

      // Element values
      let node = parent.nextSibling;
      while (node) {
        if (node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains("token.text")) {
          node.classList.add("oai-value");
        }
        node = node.nextSibling;
      }

      // Attribute values
      parent.querySelectorAll(".token.attr-value")
        .forEach(a => a.classList.add("oai-value"));

      // ⭐ Punctuation
      tagPunctuationAround("oai-punct");

      return;
    }

    /* ------------------------------------------------------------
       DC / DCTERMS NAMESPACE
       ------------------------------------------------------------ */
    if (prefix.startsWith("dc:") || prefix.startsWith("dcterms:")) {
      ns.classList.add("dcns");

      const local = ns.nextElementSibling;
      if (local && local.classList.contains("token.tag")) {
        local.classList.add("dcns");
      }

      // Element values
      let node = parent.nextSibling;
      while (node) {
        if (node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains("token.text")) {
          node.classList.add("dcns-value");
        }
        node = node.nextSibling;
      }

      // Attribute values
      parent.querySelectorAll(".token.attr-value")
        .forEach(a => a.classList.add("dcns-value"));

      // ⭐ Punctuation
      tagPunctuationAround("dcns-punct");

      return;
    }

    /* ------------------------------------------------------------
       ALL OTHER NAMESPACES
       ------------------------------------------------------------ */
    ns.classList.add("generic-ns");

    const local = ns.nextElementSibling;
    if (local && local.classList.contains("token.tag")) {
      local.classList.add("generic-ns");
    }

    // Element values
    let node = parent.nextSibling;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE &&
          node.classList.contains("token.text")) {
        node.classList.add("generic-value");
      }
      node = node.nextSibling;
    }

    // Attribute values
    parent.querySelectorAll(".token.attr-value")
      .forEach(a => a.classList.add("generic-value"));

    // Punctuation
    tagPunctuationAround("generic-punct");
  });
}
