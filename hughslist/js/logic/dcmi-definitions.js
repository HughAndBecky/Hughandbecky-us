// logic/dcmi-definitions.js
// ---------------------------------------------
// Load DCMIType definitions from CSV
// ---------------------------------------------

export async function loadDCMIDefinitions() {
  const response = await fetch("data/DC-dcmitypes.csv");
  const text = await response.text();

  const lines = text.trim().split("\n").slice(1); // skip header
  const defs = {};

  for (const line of lines) {
    // CSV-safe split (handles quoted commas)
    const cols = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!cols) continue;

    const id = cols[0].replace(/^"|"$/g, "");          // id column (e.g., StillImage)
    const definition = cols[3].replace(/^"|"$/g, "");  // definition column
    const comment = cols[5] ? cols[5].replace(/^"|"$/g, "") : ""; // comment column

    defs[id] = { definition, comment };

  }

  return defs;
}
