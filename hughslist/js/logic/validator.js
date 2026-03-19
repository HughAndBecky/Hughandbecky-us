// logic/validator.js

export function validateRecord(values) {
  const errors = [];
  const warnings = [];

  // Example: required title
  if (!values.title || values.title.trim() === "") {
    errors.push({
      field: "title",
      message: "Title is required."
    });
  }

  // Example: W3CDTF date
  if (values.created && !isValidW3CDTF(values.created)) {
    errors.push({
      field: "created",
      message: "Created date must be YYYY-MM-DD."
    });
  }

  // Example: URI
  if (values.accrualMethod && !isValidURI(values.accrualMethod)) {
    errors.push({
      field: "accrualMethod",
      message: "Accrual Method must be a valid URI."
    });
  }

  return { errors, warnings };
}


function isValidW3CDTF(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isValidURI(str) {
  try { new URL(str); return true; }
  catch { return false; }
}
