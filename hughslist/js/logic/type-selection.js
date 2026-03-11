// logic/type-selection.js

export function applyTypeSelection(type) {
  console.log("DCMIType selected:", type);

  // 1. Update hidden field for XML output
  const hidden = document.getElementById("dcmitypeField");
  if (hidden) hidden.value = type;

  // 2. Show/hide UI based on type
  document.querySelectorAll("[data-type-required]").forEach(el => {
    const required = el.dataset.typeRequired.split("|");
    el.style.display = required.includes(type) ? "" : "none";
  });

  // 3. Trigger XML regeneration if your pipeline supports it
  if (typeof window.updateXMLPreview === "function") {
    window.updateXMLPreview();
  }
}
