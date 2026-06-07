import { slugifyTr, safeDecodeURIComponent, slugsMatch, normalizeSlugKey } from "./slugify";
import { categoryPath, getStoreRoutes } from "./storeRoutes";

function isBadSlug(slug) {
  if (!slug) return true;
  const s = String(slug).trim();
  return /^\d+$/.test(s) || s.length < 2;
}

/** Her zaman kategori adından SEO slug: bileklikler, 3-lü-set-figürler */
export function getCategorySlug(category) {
  if (!category) return null;

  if (category.name) {
    const fromName = slugifyTr(category.name);
    if (fromName) return fromName;
  }

  if (category.slug && !isBadSlug(category.slug)) {
    const fromDb = slugifyTr(category.slug);
    if (fromDb) return fromDb;
  }

  return null;
}

/** /kategoriler/bileklikler veya /en/categories/bileklikler */
export function getCategoryHref(category, locale = "tr") {
  const slug = getCategorySlug(category);
  const base = getStoreRoutes(locale).categories;
  if (!slug) return base;
  return categoryPath(slug, locale);
}

export function findCategoryBySlug(categories, rawSlug) {
  if (!rawSlug || !Array.isArray(categories)) return null;

  const decoded = safeDecodeURIComponent(rawSlug);

  if (/^\d+$/.test(decoded)) {
    const byId = categories.find((c) => String(c.id ?? c._id) === decoded);
    if (byId) return byId;
  }

  const target = normalizeSlugKey(decoded);

  return categories.find((c) => {
    if (!c) return false;
    if (c.name && normalizeSlugKey(c.name) === target) return true;
    if (c.slug && slugsMatch(decoded, c.slug)) return true;
    if (c.name && slugsMatch(decoded, c.name)) return true;
    return false;
  });
}
