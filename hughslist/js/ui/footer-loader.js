export async function loadFooter() {
  const container = document.getElementById("footer-container");
  if (!container) return;

  const resp = await fetch("partials/footer.html");
  if (!resp.ok) return;

  container.innerHTML = await resp.text();
}
