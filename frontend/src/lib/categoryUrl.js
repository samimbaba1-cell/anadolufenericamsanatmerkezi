import { slugifyTr, safeDecodeURIComponent, slugsMatch } from "./slugify";

/** Kategori linki — yalnızca sayısal id (?category=3), Türkçe slug URL yok */
export function getCategoryHref(category) {
  if (!category) return "/categories";
  const id = category.id ?? category._id;
  if (id != null && id !== "") {
    const num = Number(id);
    if (Number.isFinite(num)) {
      return `/categories?category=${num}`;
    }
    return `/categories?category=${String(id)}`;
  }
  return "/categories";
}

/** Eski /categories/bileklikler veya Türkçe karakterli slug linkleri için eşleştirme */
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
