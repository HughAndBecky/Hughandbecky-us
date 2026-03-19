document.getElementById("import-button").addEventListener("click", () => {
    const input = document.getElementById("import-input").value.trim();
    const status = document.getElementById("import-status");

    if (!input) {
        status.textContent = "Please paste something to import.";
        return;
    }

    status.textContent = "Detecting…";

    // TODO: classify input (DOI, OLAC URL, OAI-PMH, etc.)
    // TODO: fetch metadata
    // TODO: normalize into builder format
    // TODO: merge into UI fields

    status.textContent = "Import logic not implemented yet.";
});
