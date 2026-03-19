// logic/accession.js
import { loadCSV } from "../utils/csv-loader.js";

export async function initAccessionUI() {
  await populateAccessionDropdowns();
  setupMediatorToggle();

  // NEW: wire up date fields so XML updates immediately
  ["accession-created", "accession-modified"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {});
      el.addEventListener("change", () => {});
    }
  });
}


/* ------------------------------
   1. Load CSVs and populate UI
------------------------------ */

async function populateAccessionDropdowns() {
  const relators = await loadCSV("data/collection-relators.csv");
  const accrual = await loadCSV("data/DC-Collection-Accrual-Method.csv");

  fillSelect("accession-role", relators, "uri", "label");

  // Expecting columns: method, periodicity, policy, label
  fillSelect("accrual-method", accrual.filter(r => r.type === "method"), "uri", "label");
  fillSelect("accrual-periodicity", accrual.filter(r => r.type === "periodicity"), "uri", "label");
  fillSelect("accrual-policy", accrual.filter(r => r.type === "policy"), "uri", "label");
}

function fillSelect(id, rows, valueKey, labelKey) {
  const select = document.getElementById(id);
  if (!select) return;

  rows.forEach(row => {
    const opt = document.createElement("option");
    opt.value = row[valueKey];
    opt.textContent = row[labelKey];
    select.appendChild(opt);
  });
}

/* ------------------------------
   2. Mediator literal/URI toggle
------------------------------ */

function setupMediatorToggle() {
  const typeSelect = document.getElementById("mediator-type");
  const langField = document.getElementById("mediator-lang-field");

  if (!typeSelect || !langField) return;

  const update = () => {
    if (typeSelect.value === "literal") {
      langField.style.display = "block";
    } else {
      langField.style.display = "none";
    }
  };

  typeSelect.addEventListener("change", update);
  update();
}

/* ------------------------------
   3. Export XML-ready values
------------------------------ */

export function getAccessionXMLValues() {
  return {
    created: document.getElementById("accession-created").value || "",
    modified: document.getElementById("accession-modified").value || "",

    accrualMethod: document.getElementById("accrual-method").value || "",
    accrualPeriodicity: document.getElementById("accrual-periodicity").value || "",
    accrualPolicy: document.getElementById("accrual-policy").value || "",

    role: document.getElementById("accession-role").value || "",
    roleName: document.getElementById("accession-role-name").value || "",

    mediatorType: document.getElementById("mediator-type").value,
    mediatorValue: document.getElementById("mediator-value").value || "",
    mediatorLang: document.getElementById("mediator-lang").value || "",

    relationURI: document.getElementById("accession-relation").value || ""
  };
}
