const {
  limitImages,
  computePricing,
  getBrand,
  mapCategory,
  resolveMapping
} = require('./helpers');

function buildHepsiburadaPayload(products, config, mappings, siteOrigin) {
  const feedConfig = config.feedSettings || {};
  return products.map((product) => {
    const brandName = getBrand(product, config);
    const categoryInfo = mapCategory(product);
    const brandId = resolveMapping(mappings?.hepsiburada?.brandMap, brandName);
    const categoryId =
      resolveMapping(mappings?.hepsiburada?.categoryMap, categoryInfo.name) ||
      resolveMapping(mappings?.hepsiburada?.categoryMap, categoryInfo.id);
    if (!brandId) {
      throw new Error(`'${product.name}' ürünü için Hepsiburada marka eşlemesi bulunamadı (${brandName || 'belirtilmemiş'}).`);
    }
    if (!categoryId) {
      throw new Error(
        `'${product.name}' ürünü için Hepsiburada kategori eşlemesi bulunamadı (${categoryInfo.name || categoryInfo.id || 'belirtilmemiş'}).`
      );
    }

    const { price, listPrice } = computePricing(product);
    const images = limitImages(product.images, feedConfig.imageLimit || 5, siteOrigin);
    return {
      merchantSku: product.sku || String(product.id),
      title: product.name,
      description: product.shortDescription || product.description || '',
      brandId: Number(brandId),
      categoryId: Number(categoryId),
      barcode: product.barcode || '',
      images,
      price: Number(price.toFixed(2)),
      listPrice: Number(listPrice.toFixed(2)),
      vatRate: Number(feedConfig.vat || 20),
      quantity: Math.max(0, Number(product.stock || 0)),
      stockCode: product.sku || String(product.id),
      deliveryTime: feedConfig.deliveryDays || 3
    };
  });
}

async function push(products, config, ctx) {
  const { decryptField, getMappings, fetch } = ctx;
  const creds = config.apiCredentials?.hepsiburada || {};
  const merchantId = creds.merchantId;
  const username = creds.username;
  const password = decryptField(creds.password);

  if (!creds.enabled) {
    throw new Error('Hepsiburada API entegrasyonu devre dışı.');
  }
  if (!merchantId || !username || !password) {
    throw new Error('Hepsiburada API bilgileri eksik (merchantId, kullanıcı adı, şifre).');
  }

  const mappings = await getMappings();
  const items = buildHepsiburadaPayload(products, config, mappings, ctx.siteOrigin);

  const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `https://omsapi.hepsiburada.com/suppliers/${merchantId}/products/import`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
      merchantid: merchantId
    },
    body: JSON.stringify({ items })
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Hepsiburada API hatası (${response.status}): ${json?.message || json?.errors || text}`);
  }

  return {
    marketplace: 'hepsiburada',
    requestCount: items.length,
    response: json
  };
}

module.exports = {
  id: 'hepsiburada',
  label: 'Hepsiburada',
  push
};
