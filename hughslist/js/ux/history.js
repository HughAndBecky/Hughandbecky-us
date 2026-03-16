// history.js
// Browser History integration for current chooser architecture
// (no direct access to chooser closure state required)

let currentAnswers = [];
let isRestoring = false;
let isInitialized = false;

function buildHash(answers) {
  if (!answers || answers.length === 0) {
    return `${window.location.pathname}${window.location.search}`;
  }
  const encoded = answers.map(a => encodeURIComponent(a)).join("/");
  return `#chooser=${encoded}`;
}

function parseHash(hash) {
  const raw = (hash || "").replace(/^#/, "");
  if (!raw.startsWith("chooser=")) return [];
  const payload = raw.slice("chooser=".length).trim();
  if (!payload) return [];
  return payload
    .split("/")
    .map(part => decodeURIComponent(part))
    .filter(Boolean);
}

function getAnswerButtons() {
  const container = document.getElementById("buttons");
  if (!container) return [];
  return Array.from(container.querySelectorAll("button"));
}

function clickAnswerByLabel(label) {
  const btn = getAnswerButtons().find(
    b => b.textContent.trim() === label.trim()
  );
  if (!btn) return false;
  btn.click(); // drives chooser's own internal state machine
  return true;
}

function restoreChooserFromAnswers(answers) {
  const backBtn = document.getElementById("backBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (!resetBtn || !backBtn) return;

  isRestoring = true;
  try {
    // Start from root state
    resetBtn.click();

    const applied = [];
    for (const ans of answers) {
      const ok = clickAnswerByLabel(ans);
      if (!ok) break;
      applied.push(ans);
    }
    currentAnswers = applied;
  } finally {
    isRestoring = false;
  }
}

export function initializeHistory() {
  if (isInitialized) return;
  isInitialized = true;

  window.addEventListener("DOMContentLoaded", () => {
    const buttonsContainer = document.getElementById("buttons");
    const backBtn = document.getElementById("backBtn");
    const resetBtn = document.getElementById("resetBtn");

    if (!buttonsContainer || !backBtn || !resetBtn) return;

    // Answer clicks (forward navigation)
    buttonsContainer.addEventListener("click", (event) => {
      if (isRestoring) return;
      const btn = event.target.closest("button");
      if (!btn) return;

      const answer = btn.textContent.trim();
      if (!answer) return;

      currentAnswers.push(answer);
      history.pushState(
        { chooserAnswers: [...currentAnswers] },
        "",
        buildHash(currentAnswers)
      );
    });

    // Chooser Back button (internal back)
    backBtn.addEventListener("click", () => {
      if (isRestoring) return;
      if (currentAnswers.length > 0) currentAnswers.pop();

      history.replaceState(
        { chooserAnswers: [...currentAnswers] },
        "",
        buildHash(currentAnswers)
      );
    });

    // Chooser Reset button
    resetBtn.addEventListener("click", () => {
      if (isRestoring) return;
      currentAnswers = [];

      history.replaceState(
        { chooserAnswers: [] },
        "",
        buildHash([])
      );
    });

    // Defer initial restore so chooser init/render in main.js has completed.
    setTimeout(() => {
      const fromHash = parseHash(window.location.hash);
      if (fromHash.length > 0) {
        restoreChooserFromAnswers(fromHash);
      } else {
        currentAnswers = [];
      }

      history.replaceState(
        { chooserAnswers: [...currentAnswers] },
        "",
        buildHash(currentAnswers)
      );
    }, 0);
  });

  // Browser Back/Forward
  window.addEventListener("popstate", (event) => {
    const answers =
      event.state?.chooserAnswers ??
      parseHash(window.location.hash) ??
      [];

    restoreChooserFromAnswers(Array.isArray(answers) ? answers : []);

    // Keep URL/state canonical after replay
    history.replaceState(
      { chooserAnswers: [...currentAnswers] },
      "",
      buildHash(currentAnswers)
    );
  });
}

// Compatibility export (legacy callers may still import this)
export function showStep(stepId, fromPopState = false) {
  const answers = Array.isArray(stepId) ? stepId : parseHash(String(stepId || ""));
  restoreChooserFromAnswers(answers);

  if (!fromPopState) {
    history.pushState(
      { chooserAnswers: [...currentAnswers] },
      "",
      buildHash(currentAnswers)
    );
  }
}