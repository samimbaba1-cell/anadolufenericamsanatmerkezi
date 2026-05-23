/** Türkçe karakterleri koruyarak URL slug */
function slugifyTr(input) {
  return String(input || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9çğıöşü]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function normalizeSlugKey(value) {
  return slugifyTr(safeDecodeURIComponent(value));
}

function slugsMatch(a, b) {
  const x = normalizeSlugKey(a);
  const y = normalizeSlugKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const ascii = (s) =>
    s
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u");
  return ascii(x) === ascii(y);
}

module.exports = {
  slugifyTr,
  safeDecodeURIComponent,
  normalizeSlugKey,
  slugsMatch
};
