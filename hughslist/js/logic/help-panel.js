// js/logic/help-panel.js

export function initHelpPanel() {
  const helpContainer = document.getElementById("help-container");
  const helpToggle = document.getElementById("help-toggle");

  if (!helpContainer || !helpToggle) return;

  helpToggle.addEventListener("click", () => {
    const isCollapsed = helpContainer.classList.toggle("collapsed");
    helpToggle.setAttribute("aria-expanded", String(!isCollapsed));
  });
}
