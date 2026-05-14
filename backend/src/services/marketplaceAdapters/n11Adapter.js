const { limitImages, computePricing, getBrand, mapCategory, resolveMapping } = require('./helpers');

function buildN11SoapProduct(product, config, mappings, siteOrigin) {
  const brandName = getBrand(product, config);
  const categoryInfo = mapCategory(product);
  const categoryId =
    resolveMapping(mappings?.n11?.categoryMap, categoryInfo.name) ||
    resolveMapping(mappings?.n11?.categoryMap, categoryInfo.id);
  if (!categoryId) {
    throw new Error(`'${product.name}' ürünü için N11 kategori eşlemesi bulunamadı (${categoryInfo.name || categoryInfo.id || 'belirtilmemiş'}).`);
  }
  const images = limitImages(product.images, config.feedSettings?.imageLimit || 5, siteOrigin)
    .map((url) => `<image>${url}</image>`)
    .join('');
  const { price, listPrice } = computePricing(product);

  return `
    <product>
      <productSellerCode>${product.sku || product.id}</productSellerCode>
      <title>${product.name}</title>
      <description>${product.shortDescription || product.description || ''}</description>
      <category>
        <id>${categoryId}</id>
      </category>
      <price>${price.toFixed(2)}</price>
      <displayPrice>${listPrice.toFixed(2)}</displayPrice>
      <stockItems>
        <stockItem>
          <sellerStockCode>${product.sku || product.id}</sellerStockCode>
          <optionName>${brandName}</optionName>
          <quantity>${Math.max(0, Number(product.stock || 0))}</quantity>
          <dispatchTime>${config.feedSettings?.deliveryDays || 3}</dispatchTime>
        </stockItem>
      </stockItems>
      <brand>${brandName || 'Generic'}</brand>
      <images>${images}</images>
    </product>
  `;
}

async function push(products, config, ctx) {
  const { decryptField, getMappings, fetch } = ctx;
  const creds = config.apiCredentials?.n11 || {};
  const appKey = creds.appKey;
  const appSecret = decryptField(creds.appSecret);

  if (!creds.enabled) {
    throw new Error('N11 API entegrasyonu devre dışı.');
  }
  if (!appKey || !appSecret) {
    throw new Error('N11 API bilgileri eksik (appKey ve appSecret).');
  }

  const mappings = await getMappings();
  const productXml = buildN11SoapProduct(products[0], config, mappings, ctx.siteOrigin);

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="http://api.n11.com/ws">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:SaveProductRequest>
      <auth>
        <appKey>${appKey}</appKey>
        <appSecret>${appSecret}</appSecret>
      </auth>
      ${productXml}
    </urn:SaveProductRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch('https://api.n11.com/ws/ProductService.svc', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: 'SaveProduct'
    },
    body: soapBody
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`N11 API hatası (${response.status}): ${text}`);
  }

  return {
    marketplace: 'n11',
    requestCount: 1,
    response: { raw: text }
  };
}

module.exports = {
  id: 'n11',
  label: 'N11',
  push
};
