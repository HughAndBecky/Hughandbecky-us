// ---------------- XML SANITIZER ----------------
export function sanitizeXML(value) {
  if (!value) return "";
  value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
