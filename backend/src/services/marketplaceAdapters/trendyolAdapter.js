const {
  limitImages,
  computePricing,
  getBrand,
  mapCategory,
  resolveMapping
} = require('./helpers');

function buildTrendyolPayload(products, config, mappings, siteOrigin) {
  const feedConfig = config.feedSettings || {};
  const items = [];

  products.forEach((product) => {
    const brandName = getBrand(product, config);
    const categoryInfo = mapCategory(product);
    const brandId = resolveMapping(mappings?.trendyol?.brandMap, brandName);
    const categoryId =
      resolveMapping(mappings?.trendyol?.categoryMap, categoryInfo.name) ||
      resolveMapping(mappings?.trendyol?.categoryMap, categoryInfo.id);

    if (!brandId) {
      throw new Error(
        `'${product.name}' ürünü için Trendyol marka eşlemesi bulunamadı. Marka: ${brandName || 'belirtilmemiş'}`
      );
    }
    if (!categoryId) {
      throw new Error(
        `'${product.name}' ürünü için Trendyol kategori eşlemesi bulunamadı. Kategori: ${categoryInfo.name || categoryInfo.id || 'belirtilmemiş'}`
      );
    }

    const { price, listPrice } = computePricing(product);
    const images = limitImages(product.images, feedConfig.imageLimit || 5, siteOrigin);

    items.push({
      barcode: product.barcode || product.sku || String(product.id),
      title: product.name,
      productMainId: product.sku || String(product.id),
      brandId: Number(brandId),
      categoryId: Number(categoryId),
      quantity: Math.max(0, Number(product.stock || 0)),
      dimensionalWeight: Math.max(1, Number(product.weight || 1)),
      description: product.shortDescription || product.description || '',
      currencyType: feedConfig.currency || 'TRY',
      listPrice: Number(listPrice.toFixed(2)),
      salePrice: Number(price.toFixed(2)),
      vatRate: Number(feedConfig.vat || 20),
      cargoCompanyId: 1,
      stockCode: product.sku || String(product.id),
      images: images.map((url, index) => ({ url, order: index + 1 })),
      attributes: []
    });
  });

  return { items };
}

async function push(products, config, ctx) {
  const { decryptField, getMappings, fetch } = ctx;
  const creds = config.apiCredentials?.trendyol || {};
  const supplierId = creds.supplierId;
  const username = creds.username;
  const password = decryptField(creds.password);

  if (!creds.enabled) {
    throw new Error('Trendyol API entegrasyonu devre dışı bırakılmış.');
  }
  if (!supplierId || !username || !password) {
    throw new Error('Trendyol API bilgileri eksik. Tedarikçi ID, kullanıcı adı ve şifre tanımlanmalı.');
  }

  const mappings = await getMappings();
  const payload = buildTrendyolPayload(products, config, mappings, ctx.siteOrigin);

  const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
      supplierid: supplierId
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Trendyol API hatası (${response.status}): ${json?.message || json?.errors || text}`);
  }

  return {
    marketplace: 'trendyol',
    requestCount: payload.items.length,
    response: json
  };
}

module.exports = {
  id: 'trendyol',
  label: 'Trendyol',
  push
};
