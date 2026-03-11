// ---------------- APPLY TRANSLATIONS ----------------
export function applyTranslations(translations) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[key]) el.textContent = translations[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[key]) el.placeholder = translations[key];
  });

  document.querySelectorAll("[data-i18n-help]").forEach(el => {
    const key = el.getAttribute("data-i18n-help");
    if (translations[key]) el.textContent = translations[key];
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (translations[key]) el.title = translations[key];
  });
}
