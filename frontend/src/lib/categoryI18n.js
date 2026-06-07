import { slugifyTr, normalizeSlugKey, slugsMatch, safeDecodeURIComponent } from "./slugify";

/** Türkçe slug → İngilizce görünen ad + URL slug (admin nameEn yoksa) */
const CATEGORY_EN_BY_TR_SLUG = {
  kolyeler: { name: "Necklaces", slug: "necklaces" },
  bileklikler: { name: "Bracelets", slug: "bracelets" },
  yuzukler: { name: "Rings", slug: "rings" },
  "su-bardaklari": { name: "Water Glasses", slug: "water-glasses" },
  "3-lu-set-figurler": { name: "3-Piece Figure Sets", slug: "3-piece-figure-sets" },
  "3-lü-set-figürler": { name: "3-Piece Figure Sets", slug: "3-piece-figure-sets" },
  "sevgililer-gunu": { name: "Valentine's Day", slug: "valentines-day" },
  "limonata-bardaklari": { name: "Lemonade Glasses", slug: "lemonade-glasses" },
  "raki-bardaklari": { name: "Raki Glasses", slug: "raki-glasses" },
  "cam-pipetleri": { name: "Glass Straws", slug: "glass-straws" },
  kupeler: { name: "Earrings", slug: "earrings" },
  "cam-figurler": { name: "Glass Figures", slug: "glass-figures" },
  "cam-agaclar": { name: "Glass Trees", slug: "glass-trees" },
  "cam-figürler": { name: "Glass Figures", slug: "glass-figures" },
  "cam-ağaçlar": { name: "Glass Trees", slug: "glass-trees" }
};

const EN_SLUG_TO_TR_SLUG = Object.fromEntries(
  Object.entries(CATEGORY_EN_BY_TR_SLUG).map(([tr, { slug }]) => [slug, tr])
);

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

  const trSlug = getCategoryTrSlug(category);
  const mapped = trSlug ? CATEGORY_EN_BY_TR_SLUG[normalizeSlugKey(trSlug)] : null;
  if (mapped?.slug) return mapped.slug;

  if (category.name) return slugifyEn(category.name);
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
    const trSlug = getCategoryTrSlug(category);
    const mapped = trSlug ? CATEGORY_EN_BY_TR_SLUG[normalizeSlugKey(trSlug)] : null;
    if (mapped?.name) return mapped.name;
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

/** URL slug'ını diğer locale'e çevir (kategori listesi yokken statik harita) */
export function convertCategorySlugBetweenLocales(rawSlug, fromLocale, toLocale) {
  if (!rawSlug || fromLocale === toLocale) return rawSlug;
  const key = normalizeSlugKey(rawSlug);

  if (fromLocale === "tr" && toLocale === "en") {
    return CATEGORY_EN_BY_TR_SLUG[key]?.slug || slugifyEn(rawSlug);
  }
  if (fromLocale === "en" && toLocale === "tr") {
    const trKey = EN_SLUG_TO_TR_SLUG[key] || EN_SLUG_TO_TR_SLUG[normalizeSlugKey(slugifyEn(rawSlug))];
    return trKey || slugifyTr(rawSlug);
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

  const byLocaleSlug = categories.find((c) => {
    const slug = getCategorySlug(c, locale);
    return slug && normalizeSlugKey(slug) === target;
  });
  if (byLocaleSlug) return byLocaleSlug;

  const byTrSlug = categories.find((c) => {
    const trSlug = getCategoryTrSlug(c);
    return trSlug && normalizeSlugKey(trSlug) === target;
  });
  if (byTrSlug) return byTrSlug;

  const byEnSlug = categories.find((c) => {
    const enSlug = getCategoryEnSlug(c);
    return enSlug && normalizeSlugKey(enSlug) === target;
  });
  if (byEnSlug) return byEnSlug;

  return categories.find((c) => {
    if (!c) return false;
    if (c.name && normalizeSlugKey(c.name) === target) return true;
    if (c.slug && slugsMatch(decoded, c.slug)) return true;
    if (c.name && slugsMatch(decoded, c.name)) return true;
    return false;
  });
}
