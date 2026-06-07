import { slugifyTr, normalizeSlugKey, slugsMatch, safeDecodeURIComponent } from "./slugify";

/** TR slug (Türkçe karakterli) → EN ad + slug */
const CATEGORY_TRANSLATIONS = [
  { trSlug: "kolyeler", nameEn: "Necklaces", slugEn: "necklaces" },
  { trSlug: "bileklikler", nameEn: "Bracelets", slugEn: "bracelets" },
  { trSlug: "yüzükler", nameEn: "Rings", slugEn: "rings" },
  { trSlug: "su-bardakları", nameEn: "Water Glasses", slugEn: "water-glasses" },
  { trSlug: "3-lü-set-figürler", nameEn: "3-Piece Figure Sets", slugEn: "3-piece-figure-sets" },
  { trSlug: "sevgililer-günü", nameEn: "Valentine's Day", slugEn: "valentines-day" },
  { trSlug: "limonata-bardakları", nameEn: "Lemonade Glasses", slugEn: "lemonade-glasses" },
  { trSlug: "rakı-bardakları", nameEn: "Raki Glasses", slugEn: "raki-glasses" },
  { trSlug: "cam-pipetleri", nameEn: "Glass Straws", slugEn: "glass-straws" },
  { trSlug: "küpeler", nameEn: "Earrings", slugEn: "earrings" },
  { trSlug: "cam-figürler", nameEn: "Glass Figures", slugEn: "glass-figures" },
  { trSlug: "cam-ağaçlar", nameEn: "Glass Trees", slugEn: "glass-trees" }
];

const LOOKUP_BY_KEY = {};
const EN_SLUG_TO_TR_SLUG = {};

for (const entry of CATEGORY_TRANSLATIONS) {
  const keys = new Set([
    normalizeSlugKey(entry.trSlug),
    slugifyEn(entry.trSlug),
    slugifyEn(entry.nameEn)
  ]);
  for (const key of keys) {
    if (key) LOOKUP_BY_KEY[key] = entry;
  }
  EN_SLUG_TO_TR_SLUG[entry.slugEn] = entry.trSlug;
}

function transliterateTrToAscii(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U");
}

/** ASCII URL slug (EN mod) */
export function slugifyEn(input) {
  return transliterateTrToAscii(input)
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isBadSlug(slug) {
  if (!slug) return true;
  const s = String(slug).trim();
  return /^\d+$/.test(s) || s.length < 2;
}

function lookupTranslation(categoryOrSlugKey) {
  if (!categoryOrSlugKey) return null;

  if (typeof categoryOrSlugKey === "object") {
    const trSlug = getCategoryTrSlug(categoryOrSlugKey);
    const keys = [
      trSlug && normalizeSlugKey(trSlug),
      trSlug && slugifyEn(trSlug),
      categoryOrSlugKey.name && slugifyEn(categoryOrSlugKey.name)
    ].filter(Boolean);
    for (const key of keys) {
      if (LOOKUP_BY_KEY[key]) return LOOKUP_BY_KEY[key];
    }
    return null;
  }

  const keys = [normalizeSlugKey(categoryOrSlugKey), slugifyEn(categoryOrSlugKey)];
  for (const key of keys) {
    if (LOOKUP_BY_KEY[key]) return LOOKUP_BY_KEY[key];
  }
  return null;
}

export function getCategoryTrSlug(category) {
  if (!category) return null;
  if (category.name) {
    const fromName = slugifyTr(category.name);
    if (fromName) return fromName;
  }
  if (category.slug && !isBadSlug(category.slug)) {
    return slugifyTr(category.slug);
  }
  return null;
}

export function getCategoryEnSlug(category) {
  if (!category) return null;
  if (category.slugEn?.trim()) return slugifyEn(category.slugEn);
  if (category.nameEn?.trim()) return slugifyEn(category.nameEn);

  const mapped = lookupTranslation(category);
  if (mapped?.slugEn) return mapped.slugEn;

  if (category.name) return slugifyEn(category.name);
  const trSlug = getCategoryTrSlug(category);
  if (trSlug) return slugifyEn(trSlug);
  return null;
}

export function getCategorySlug(category, locale = "tr") {
  return locale === "en" ? getCategoryEnSlug(category) : getCategoryTrSlug(category);
}

export function getCategoryDisplayName(category, locale = "tr") {
  if (!category) return "";
  if (locale === "en") {
    if (category.nameEn?.trim()) return category.nameEn.trim();
    const mapped = lookupTranslation(category);
    if (mapped?.nameEn) return mapped.nameEn;
  }
  return category.name || "";
}

export function getCategoryDescription(category, locale = "tr") {
  if (!category) return "";
  if (locale === "en" && category.descriptionEn?.trim()) {
    return category.descriptionEn.trim();
  }
  return category.description || "";
}

/** URL slug'ını diğer locale'e çevir */
export function convertCategorySlugBetweenLocales(rawSlug, fromLocale, toLocale) {
  if (!rawSlug || fromLocale === toLocale) return rawSlug;

  const mapped = lookupTranslation(rawSlug);

  if (fromLocale === "tr" && toLocale === "en") {
    return mapped?.slugEn || slugifyEn(rawSlug);
  }
  if (fromLocale === "en" && toLocale === "tr") {
    return mapped?.trSlug || EN_SLUG_TO_TR_SLUG[normalizeSlugKey(rawSlug)] || slugifyTr(rawSlug);
  }
  return rawSlug;
}

export function findCategoryBySlug(categories, rawSlug, locale = "tr") {
  if (!rawSlug || !Array.isArray(categories)) return null;

  const decoded = safeDecodeURIComponent(rawSlug);

  if (/^\d+$/.test(decoded)) {
    const byId = categories.find((c) => String(c.id ?? c._id) === decoded);
    if (byId) return byId;
  }

  const target = normalizeSlugKey(decoded);
  const targetAscii = slugifyEn(decoded);

  const byLocaleSlug = categories.find((c) => {
    const slug = getCategorySlug(c, locale);
    if (!slug) return false;
    const n = normalizeSlugKey(slug);
    return n === target || slugifyEn(slug) === targetAscii;
  });
  if (byLocaleSlug) return byLocaleSlug;

  const mapped = lookupTranslation(decoded);
  if (mapped) {
    const byMap = categories.find((c) => {
      const trSlug = getCategoryTrSlug(c);
      return trSlug && normalizeSlugKey(trSlug) === normalizeSlugKey(mapped.trSlug);
    });
    if (byMap) return byMap;
  }

  return categories.find((c) => {
    if (!c) return false;
    if (c.name && normalizeSlugKey(c.name) === target) return true;
    if (c.slug && slugsMatch(decoded, c.slug)) return true;
    if (c.name && slugsMatch(decoded, c.name)) return true;
    return false;
  });
}
