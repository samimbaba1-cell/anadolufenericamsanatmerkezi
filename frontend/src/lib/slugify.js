/** Türkçe karakterleri ASCII'ye çevirip URL slug üretir (backend ile aynı mantık) */
const TR_MAP = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u"
};

function transliterateTr(text) {
  return String(text || "")
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("");
}

export function slugifyTr(input) {
  return transliterateTr(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

/** URL slug ile kategori slug/adını karşılaştır (Türkçe/encoding farklarını yok sayar) */
export function slugsMatch(urlSlug, categorySlugOrName) {
  const a = slugifyTr(safeDecodeURIComponent(urlSlug));
  const b = slugifyTr(categorySlugOrName);
  if (!a || !b) return false;
  return a === b;
}
