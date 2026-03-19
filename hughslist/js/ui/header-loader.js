export async function loadHeader() {
  const container = document.getElementById("header-container");
  if (!container) return;

  const resp = await fetch("partials/header.html");
  if (!resp.ok) return;

  container.innerHTML = await resp.text();
}
