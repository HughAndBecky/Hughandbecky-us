// ---------------- XML VALIDATION ----------------
export const validationMessages = {
  "validation.illegal_chars": "Contains illegal XML control characters.",
  "validation.angle_brackets": "Angle brackets < > are not allowed in XML text content.",
  "validation.ampersand": "Ampersands must be escaped as &amp;."
};

const illegalXML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

export function validateXML(value) {
  if (!value) return { valid: true, key: "" };

  if (illegalXML.test(value)) {
    return { valid: false, key: "validation.illegal_chars" };
  }
  if (value.includes("<") || value.includes(">")) {
    return { valid: false, key: "validation.angle_brackets" };
  }
  if (value.includes("&") && !value.match(/&(?:amp|lt|gt|quot|apos);/)) {
    return { valid: false, key: "validation.ampersand" };
  }
  return { valid: true, key: "" };
}
