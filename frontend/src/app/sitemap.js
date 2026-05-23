import { getApiBaseUrl } from "../lib/api-base";
import { getCategorySlug } from "../lib/categoryUrl";

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(
    /\/$/,
    ""
  );
  const now = new Date().toISOString();

  const staticPages = [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/categories`, lastModified: now },
    { url: `${base}/about`, lastModified: now },
    { url: `${base}/contact`, lastModified: now }
  ];

  let products = [];
  let categoryPages = [];

  try {
    const api = getApiBaseUrl();
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${api}/api/products?limit=500`, { cache: "no-store" }),
      fetch(`${api}/api/categories`, { cache: "no-store" })
    ]);

    if (productsRes.ok) {
      const data = await productsRes.json();
      products = (data.items || []).map((p) => ({
        url: `${base}/product/${p.id ?? p._id}`,
        lastModified: now
      }));
    }

    if (categoriesRes.ok) {
      const categories = await categoriesRes.json();
      categoryPages = (Array.isArray(categories) ? categories : [])
        .map((cat) => {
          const slug = getCategorySlug(cat);
          if (!slug) return null;
          return {
            url: `${base}/categories/${slug}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8
          };
        })
        .filter(Boolean);
    }
  } catch {
    /* API yoksa statik sayfalar yeter */
  }

  return [...staticPages, ...categoryPages, ...products];
}
