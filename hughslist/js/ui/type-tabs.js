// ui/type-tabs.js

export async function initTypeTabs(applyTypeSelection) {
  await loadDCMITypeTabs();
  bindDCMITypeEvents(applyTypeSelection);
}

async function loadDCMITypeTabs() {
  const response = await fetch("data/DC-dcmitypes.csv");
  const text = await response.text();

  const rows = text.trim().split("\n");
  const header = rows.shift().split(",");

  // Find the label column (fallback to first column)
  const labelIndex = header.indexOf("label") !== -1 ? header.indexOf("label") : 0;

  const container = document.getElementById("typeTabs");
  container.innerHTML = "";

  rows.forEach(row => {
    const cols = row.split(",");
    const label = cols[labelIndex].trim();

    const btn = document.createElement("button");
    btn.className = "type-tab-button";
    btn.textContent = label;
    btn.dataset.type = label;

    container.appendChild(btn);
  });
}

function bindDCMITypeEvents(applyTypeSelection) {
  const container = document.getElementById("typeTabs");

  container.addEventListener("click", (event) => {
    const btn = event.target.closest(".type-tab-button");
    if (!btn) return;

    // Visual state
    document.querySelectorAll(".type-tab-button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Dispatch to Option C logic
    applyTypeSelection(btn.dataset.type);
  });
}
