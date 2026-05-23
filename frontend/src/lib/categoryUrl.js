/** Kategori detay / filtre sayfası linki */
export function getCategoryHref(category) {
  if (!category) return "/categories";
  const id = category.id ?? category._id;
  if (category.slug) return `/categories/${category.slug}`;
  if (id != null && id !== "") return `/categories?category=${id}`;
  return "/categories";
}

export function resolveCategoryId(category, categories = []) {
  if (!category) return "";
  const direct = category.id ?? category._id;
  if (direct != null && direct !== "") return String(direct);
  if (category.slug && categories.length) {
    const found = categories.find((c) => c.slug === category.slug);
    if (found) return String(found.id ?? found._id ?? "");
  }
  return "";
}
