function limitImages(images = [], limit = 5, siteOrigin = '') {
  const list = Array.isArray(images) ? images : [];
  const cap = Number(limit) > 0 ? Number(limit) : 5;
  const slice = list.filter(Boolean).slice(0, cap);
  const base = siteOrigin && String(siteOrigin).replace(/\/+$/, '');
  if (!base) {
    return slice.map((u) => (u == null ? '' : String(u).trim())).filter(Boolean);
  }
  return slice
    .map((u) => {
      const s = u == null ? '' : String(u).trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith('//')) return `https:${s}`;
      if (s.startsWith('/')) return `${base}${s}`;
      return `${base}/${s}`;
    })
    .filter(Boolean);
}

function computePricing(product) {
  const price = Number(product.price || 0);
  const listPrice = Number(product.originalPrice || price);
  const discount = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  return { price, listPrice, discount };
}

function getBrand(product, config) {
  const brandKeys = (config?.feedSettings?.brandKeys || []).map((k) => String(k).toLowerCase());
  if (!Array.isArray(product.attributes)) return '';
  const attr = product.attributes.find((a) => a?.name && brandKeys.includes(String(a.name).toLowerCase()));
  const productBrand = product.brandRef?.name || product.brand || '';
  return attr?.value || productBrand || '';
}

function mapCategory(product) {
  if (!product.category) return { name: '', id: '' };
  const category = product.category;
  if (typeof category === 'string') {
    return { name: '', id: category };
  }
  return { name: category.name || '', id: category.id ? String(category.id) : '' };
}

function resolveMapping(mappingSection, key) {
  if (!mappingSection || !key) return '';
  return mappingSection[key] || '';
}

module.exports = {
  limitImages,
  computePricing,
  getBrand,
  mapCategory,
  resolveMapping
};
