// ---------------- MATRIX LOGIC ----------------
function parseCSV(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] || "");
    return obj;
  });
}

function removeXML(xmlLine) {
  const output = document.getElementById('output');
  const lines = output.value.split("\n").filter(l => l.trim() !== xmlLine);
  output.value = lines.join("\n");
}

function updateRowColumnHighlights() {
  const buttons = [...document.querySelectorAll("button")].filter(b => b.dataset.uri);
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
  const output = document.getElementById('output');
  const xmlLine =
    `<dcterms:conformsTo xsitype="dcterms:uri">${btn.dataset.uri}</dcterms:conformsTo>`;

  const col = btn.dataset.function;

  const sameColumnButtons = [...document.querySelectorAll(
    `button[data-function="${col}"]`
  )];

  sameColumnButtons.forEach(b => {
    if (b !== btn && b.classList.contains("active")) {
      b.classList.remove("active");
      const oldXML =
        `<dcterms:conformsTo xsitype="dcterms:uri">${b.dataset.uri}</dcterms:conformsTo>`;
      removeXML(oldXML);
    }
  });

  if (btn.classList.contains("active")) {
    btn.classList.remove("active");
    removeXML(xmlLine);
  } else {
    btn.classList.add("active");
    output.value += xmlLine + "\n";
  }

  updateRowColumnHighlights();
}

function buildMatrix(rows) {
  const services = [...new Set(rows.map(r => r["Service Model"]).filter(x => x))];
  const functions = [...new Set(rows.map(r => r["Archival Function"]).filter(x => x))];

  const table = document.getElementById('matrix');

  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th'));
  functions.forEach(fn => {
    const th = document.createElement('th');
    th.textContent = fn;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  services.forEach(service => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = service;
    tr.appendChild(th);

    functions.forEach(fn => {
      const td = document.createElement('td');
      const match = rows.find(r =>
        r["Service Model"] === service &&
        r["Archival Function"] === fn
      );

      if (match && match.URI) {
        const btn = document.createElement('button');
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
  fetch('data/matrix.csv')
    .then(r => {
      if (!r.ok) throw new Error("CSV not found");
      return r.text();
    })
    .then(csv => buildMatrix(parseCSV(csv)))
    .catch(err => {
      document.getElementById('error').textContent =
        "Could not load matrix.csv — the form cannot be built.";
    });

  document.getElementById('clearAll').onclick = () => {
    document.querySelectorAll("button.active").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("button.row-active, button.col-active")
      .forEach(b => b.classList.remove("row-active", "col-active"));
    document.getElementById('output').value = "";
  };

  document.getElementById('copyXML').onclick = async () => {
    const text = document.getElementById('output').value;
    await navigator.clipboard.writeText(text);
  };
}
