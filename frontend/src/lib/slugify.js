/** Türkçe karakterleri koruyarak URL slug (Google TR için okunabilir) */
export function slugifyTr(input) {
  return String(input || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9çğıöşü]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

export function normalizeSlugKey(value) {
  return slugifyTr(safeDecodeURIComponent(value));
}

/** Eski ASCII slug (3-lu-set) ile yeni Türkçe slug (3-lü-set) eşleşmesi */
export function slugsMatch(urlSlug, categorySlugOrName) {
  const a = normalizeSlugKey(urlSlug);
  const b = normalizeSlugKey(categorySlugOrName);
  if (!a || !b) return false;
  if (a === b) return true;
  // Eski kayıtlar: ü→u dönüşümlü slug
  const ascii = (s) =>
    s
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u");
  return ascii(a) === ascii(b);
}
