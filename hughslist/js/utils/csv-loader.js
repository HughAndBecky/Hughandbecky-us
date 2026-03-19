// utils/csv-loader.js
// Deterministic, zero-dependency CSV loader for Hughslist UI modules.
// Returns an array of objects keyed by header row.

export async function loadCSV(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CSV load failed: ${url} (${response.status})`);
  }

  let text = await response.text();

  // Remove UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map(h => h.trim());

  const rows = lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return obj;
  });

  return rows;
}
