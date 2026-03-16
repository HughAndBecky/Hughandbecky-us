// logic/load-papers.js

export async function loadPapers() {
  const papersArray = await fetch("data/papers.json").then(r => r.json());
  return Object.fromEntries(
    papersArray.map(item => [item.id, item])
  );
}

export async function loadPaperMappings() {
  return fetch("data/paper-mappings.json").then(r => r.json());
}
