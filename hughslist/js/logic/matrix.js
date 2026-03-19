// logic/matrix.js
// MATRIX UI MODULE — new architecture
// No XML writing. No DOM mutation outside the matrix table.
// XML is generated centrally in build-xml.js.

function parseCSV(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] || ""));
    return obj;
  });
}

function updateRowColumnHighlights() {
  const buttons = [...document.querySelectorAll("button[data-uri]")];
  const active = buttons.filter(b => b.classList.contains("active"));

  const activeRows = new Set(active.map(b => b.dataset.service));
  const activeCols = new Set(active.map(b => b.dataset.function));

  buttons.forEach(b => {
    b.classList.remove("row-active", "col-active");
    if (activeRows.has(b.dataset.service)) b.classList.add("row-active");
    if (activeCols.has(b.dataset.function)) b.classList.add("col-active");
  });
}

function toggleButton(btn) {
  const col = btn.dataset.function;

  // Only one active per column
  const sameColumnButtons = [
    ...document.querySelectorAll(`button[data-function="${col}"]`)
  ];

  sameColumnButtons.forEach(b => {
    if (b !== btn && b.classList.contains("active")) {
      b.classList.remove("active");
    }
  });

  // Toggle this button
  btn.classList.toggle("active");

  updateRowColumnHighlights();

  // Dynamic XML update handled globally by attachDynamicXML()
  document.dispatchEvent(new Event("input"));

}

function buildMatrix(rows) {
  const services = [...new Set(rows.map(r => r["Service Model"]).filter(x => x))];
  const functions = [...new Set(rows.map(r => r["Archival Function"]).filter(x => x))];

  const table = document.getElementById("matrix");

  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th"));
  functions.forEach(fn => {
    const th = document.createElement("th");
    th.textContent = fn;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  services.forEach(service => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = service;
    tr.appendChild(th);

    functions.forEach(fn => {
      const td = document.createElement("td");
      const match = rows.find(
        r => r["Service Model"] === service && r["Archival Function"] === fn
      );

      if (match && match.URI) {
        const btn = document.createElement("button");
        btn.textContent = "Select";
        btn.dataset.uri = match.URI;
        btn.dataset.service = service;
        btn.dataset.function = fn;
        btn.onclick = () => toggleButton(btn);
        td.appendChild(btn);
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });
}

export function initMatrix() {
  fetch("data/matrix.csv")
    .then(r => {
      if (!r.ok) throw new Error("CSV not found");
      return r.text();
    })
    .then(csv => buildMatrix(parseCSV(csv)))
    .catch(err => {
      document.getElementById("error").textContent =
        "Could not load matrix.csv — the form cannot be built.";
    });

  document.getElementById("clearAll").onclick = () => {
    document.querySelectorAll("button.active").forEach(b => b.classList.remove("active"));
    document
      .querySelectorAll("button.row-active, button.col-active")
      .forEach(b => b.classList.remove("row-active", "col-active"));
  };
}

// ------------------------------------------------------------
// NEW ARCHITECTURE: XML extraction + XML builder
// ------------------------------------------------------------

export function getMatrixXMLValues() {
  const selected = [...document.querySelectorAll("button.active[data-uri]")];

  return {
    matrixSelections: selected.map(btn => ({
      uri: btn.dataset.uri,
      service: btn.dataset.service,
      function: btn.dataset.function
    }))
  };
}

export function matrixToXML(values) {
  if (!values.matrixSelections || values.matrixSelections.length === 0) return "";

  return values.matrixSelections
    .map(sel => {
      return `<dcterms:conformsTo xsi:type="dcterms:URI">${sel.uri}</dcterms:conformsTo>`;
    })
    .join("\n");
}
