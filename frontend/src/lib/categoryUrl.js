import { slugifyTr, safeDecodeURIComponent, slugsMatch } from "./slugify";

/** SEO URL parçası: bileklikler, 3-lu-set-figurler */
export function getCategorySlug(category) {
  if (!category) return null;
  if (category.slug) {
    const s = slugifyTr(category.slug);
    if (s) return s;
  }
  if (category.name) {
    const s = slugifyTr(category.name);
    if (s) return s;
  }
  return null;
}

/** SEO dostu kategori linki: /categories/bileklikler */
export function getCategoryHref(category) {
  const slug = getCategorySlug(category);
  if (slug) return `/categories/${slug}`;
  return "/categories";
}

/** Eski / hatalı slug eşleştirmesi */
export function findCategoryBySlug(categories, rawSlug) {
  if (!rawSlug || !Array.isArray(categories)) return null;

  const decoded = safeDecodeURIComponent(rawSlug);
  const target = slugifyTr(decoded);

  return categories.find((c) => {
    if (!c) return false;
    if (c.slug && slugsMatch(decoded, c.slug)) return true;
    if (c.name && slugsMatch(decoded, c.name)) return true;
    if (c.slug && slugifyTr(c.slug) === target) return true;
    if (c.name && slugifyTr(c.name) === target) return true;
    return false;
  });
}
