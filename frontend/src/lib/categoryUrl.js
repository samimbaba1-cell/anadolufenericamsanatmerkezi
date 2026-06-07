import { normalizeSlugKey, slugsMatch } from "./slugify";
import { categoryPath, getStoreRoutes } from "./storeRoutes";
import {
  findCategoryBySlug,
  getCategorySlug,
  getCategoryTrSlug,
  slugifyEn
} from "./categoryI18n";

export {
  findCategoryBySlug,
  getCategorySlug,
  getCategoryDisplayName,
  getCategoryDescription
} from "./categoryI18n";

/** /kategoriler/bileklikler veya /en/categories/bracelets */
export function getCategoryHref(category, locale = "tr") {
  const slug = getCategorySlug(category, locale);
  const base = getStoreRoutes(locale).categories;
  if (!slug) return base;
  return categoryPath(slug, locale);
}

export function categorySlugNeedsRedirect(category, urlSlug, locale = "tr") {
  if (!category || !urlSlug) return false;
  const canonical = getCategorySlug(category, locale);
  if (!canonical) return false;
  return !slugsMatch(urlSlug, canonical) && slugifyEn(urlSlug) !== slugifyEn(canonical);
}

/** Geriye dönük uyumluluk */
export function getCategorySlugLegacy(category) {
  return getCategoryTrSlug(category);
}
