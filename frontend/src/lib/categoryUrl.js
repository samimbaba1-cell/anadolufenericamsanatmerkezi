/** Kategori sayfası linki — her zaman ?category= ile (slug route sorunlarını önler) */
export function getCategoryHref(category) {
  if (!category) return "/categories";
  const id = category.id ?? category._id;
  if (id != null && id !== "") {
    return `/categories?category=${encodeURIComponent(String(id))}`;
  }
  return "/categories";
}

export function findCategoryBySlug(categories, slug) {
  if (!slug || !Array.isArray(categories)) return null;
  const normalized = String(slug).toLowerCase();
  return (
    categories.find((c) => c.slug === slug) ||
    categories.find((c) => String(c.slug || "").toLowerCase() === normalized)
  );
}
