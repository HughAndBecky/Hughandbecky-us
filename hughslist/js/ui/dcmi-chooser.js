// ui/dcmi-chooser.js
// ---------------------------------------------
// UI + event wiring for the DCMIType chooser
// ---------------------------------------------

import { dcmiTree, allTypes, eliminationRules } from "../logic/dcmi-chooser.js";
import { loadDCMIDefinitions } from "../logic/dcmi-definitions.js";
import { loadPapers, loadPaperMappings } from "../logic/load-papers.js";


export async function initDCMIChooser() {

  // ---------------------------------------------
  // 1. Load definitions from CSV
  // ---------------------------------------------
  const definitions = await loadDCMIDefinitions();

  // ---------------------------------------------
  // 2. Load CSL papers + mappings
  // ---------------------------------------------

  const papersById = await loadPapers();
  const paperMappings = await loadPaperMappings();

  // ---------------------------------------------
  // 3. Attach definitions to the chooser tree
  // ---------------------------------------------
  for (const key in dcmiTree) {
    const node = dcmiTree[key];
    const entry = definitions[node.label];
    if (node.stop && entry) {
      node.definition = entry.definition;
      node.comment = entry.comment;
      // Attach papers (optional)
      node.papers = paperMappings[node.label] || [];
    }
  }


  // ---------------------------------------------
  // UI elements
  // ---------------------------------------------
  let current = "Q0";
  let historyStack = [];
  let eliminated = new Set();
  let selectedType = null;

  const board = document.getElementById("typeBoard");
  const q = document.getElementById("question");
  const b = document.getElementById("buttons");
  const r = document.getElementById("result");
  const bc = document.getElementById("breadcrumbs");

  const backBtn = document.getElementById("backBtn");
  const resetBtn = document.getElementById("resetBtn");

  const helpPersistent = document.getElementById("help-content-persistent");
  const helpHover = document.getElementById("help-content-hover");

  // ---------------------------------------------
  // CSL formatter function
  // ---------------------------------------------

  function formatCSL(item) {
    if (!item) return "";

    const authors = item.author
      ?.map(a => a.family)
      .join(", ") || "";

    const year = item.issued?.["date-parts"]?.[0]?.[0] || "";

    const title = item.title || "";

    const doi = item.DOI ? `https://doi.org/${item.DOI}` : "";
    const url = item.URL || "";
    const link = doi || url;

    return `
    <div class="csl-entry">
      <strong>${authors}</strong> (${year}). 
      <em>${title}</em>.
      ${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">Link <span class="external-icon">⧉</span></a>` : ""}
    </div>
  `;
  }


  // ---------------------------------------------
  // Persistent help renderer (full block)
  // ---------------------------------------------
  function showPersistentHelp(node) {
    if (!node) {
      helpPersistent.innerHTML = "";
      return;
    }

    const label = node.label;
    const definition = node.help || "";
    const uri = `http://purl.org/dc/dcmitype/${label}`;

    helpPersistent.innerHTML = `
    <div class="dcmi-help-block">
      <div class="dcmi-help-title">
        <span class="dcmi-help-prefix">Formal Dublin Core Definition</span><br>
        <strong><em>${label}</em></strong>:
      </div>
      <div class="dcmi-help-definition">
        <em>${node.definition}</em>
      </div>

      ${node.comment ? `
      <div class="dcmi-help-comment">
        ${node.comment}
      </div>
      ` : ""}
      <div class="dcmi-help-link">
        <a href="${uri}" target="_blank" rel="noopener noreferrer">
          Source <span class="external-icon">⧉</span>
        </a>
      </div>
    </div>
    ${node.papers?.length ? `
  <div class="dcmi-help-papers">
    <div class="dcmi-help-subtitle">Related Research</div>
    ${node.papers.map(key => formatCSL(papersById[key])).join("")}
  </div>
` : ""}

  `;
  }


  // ---------------------------------------------
  // Hover help renderer (same structure, lighter use)
  // ---------------------------------------------
  function showHoverHelp(node) {
    if (!node) {
      helpHover.innerHTML = "";
      return;
    }

    const label = node.label;
    const definition = node.help || "";
    const uri = `http://purl.org/dc/dcmitype/${label}`;

    helpHover.innerHTML = `
    <div class="dcmi-help-block">

      <div class="dcmi-help-title">
  <span class="dcmi-help-prefix">Formal Dublin Core Definition</span><br>
  <strong><em>${label}</em></strong>:
</div>


      <div class="dcmi-help-definition">
        <em>${node.definition}</em>
      </div>

      ${node.comment ? `
      <div class="dcmi-help-comment">
        ${node.comment}
      </div>
      ` : ""}

      <div class="dcmi-help-link">
        <a href="${uri}" target="_blank" rel="noopener noreferrer">
          Source <span class="external-icon">⧉</span>
        </a>
      </div>

    </div>
  `;
  }


  function clearHoverHelp() {
    helpHover.textContent = "";
  }

  // ---------------------------------------------
  // Render Type Board (pills)
  // ---------------------------------------------
  function renderTypeBoard() {
    board.innerHTML = "";
    allTypes.forEach(type => {
      const div = document.createElement("div");
      div.className = "type-box";

      if (eliminated.has(type)) div.classList.add("eliminated");
      if (selectedType === type) div.classList.add("selected");

      div.textContent = type;

      // Hover help
      div.addEventListener("mouseenter", () => {
        const node = Object.values(dcmiTree).find(n => n.label === type);
        showHoverHelp(node);
      });

      // Click = persistent help
      div.addEventListener("click", () => {
        const node = Object.values(dcmiTree).find(n => n.label === type);
        showPersistentHelp(node);
        clearHoverHelp();
      });


      board.appendChild(div);
    });
  }

  // ---------------------------------------------
  // Render Chooser
  // ---------------------------------------------
  function render() {
    const node = dcmiTree[current];

    r.textContent = "";
    bc.textContent = historyStack.map(step => dcmiTree[step.node].label).join(" → ");

    if (node.stop) {
      q.textContent = "Result:";
      b.innerHTML = "";
      r.textContent = node.label;
      selectedType = node.label;

      document.dispatchEvent(new CustomEvent("dcmiTypeSelected", {
        detail: { type: node.label }
      }));

      showPersistentHelp(node.help || `Selected DCMIType: ${node.label}`);
      clearHoverHelp();

      renderTypeBoard();
      return;
    }

    q.innerHTML = node.question;
    b.innerHTML = "";

    Object.entries(node.children).forEach(([label, nextId]) => {
      const btn = document.createElement("button");
      btn.textContent = label;

      // Hover help
      btn.addEventListener("mouseenter", () => {
        const next = dcmiTree[nextId];
        showHoverHelp(next);
      });

      btn.addEventListener("mouseleave", clearHoverHelp);

      // Click
      btn.addEventListener("click", () => {
        const eliminatedNow = eliminationRules[current]?.[label] || [];
        eliminatedNow.forEach(t => eliminated.add(t));

        historyStack.push({ node: current, answer: label });
        current = nextId;

        const next = dcmiTree[nextId];
        showPersistentHelp(next);
        clearHoverHelp();

        render();
        renderTypeBoard();
      });

      b.appendChild(btn);
    });
  }

  // ---------------------------------------------
  // Navigation
  // ---------------------------------------------
  backBtn.addEventListener("click", () => {
    if (historyStack.length === 0) return;

    historyStack.pop();
    eliminated.clear();
    selectedType = null;
    current = "Q0";

    historyStack.forEach(step => {
      const { node, answer } = step;
      const nextId = dcmiTree[node].children[answer];

      const eliminatedNow = eliminationRules[node]?.[answer] || [];
      eliminatedNow.forEach(t => eliminated.add(t));

      current = nextId;
    });

    showPersistentHelp("");
    clearHoverHelp();

    render();
    renderTypeBoard();
  });

  resetBtn.addEventListener("click", () => {
    current = "Q0";
    historyStack = [];
    eliminated.clear();
    selectedType = null;

    showPersistentHelp("");
    clearHoverHelp();

    render();
    renderTypeBoard();
  });

  // ---------------------------------------------
  // Initialize
  // ---------------------------------------------
  render();
  renderTypeBoard();
}
