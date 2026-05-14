import { getApiBaseUrl } from "../lib/api-base";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  let products = [];
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/products?limit=100`, { cache: 'no-store' });
    const data = await res.json();
    products = (data.items || []).map(p => ({ url: `${base}/product/${p._id}`, lastModified: new Date().toISOString() }));
  } catch (_) {}
  return [
    { url: `${base}/`, lastModified: new Date().toISOString() },
    { url: `${base}/categories`, lastModified: new Date().toISOString() },
    ...products,
  ];
}
