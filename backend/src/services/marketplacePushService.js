const MarketplaceConfig = require('../models/MarketplaceConfig');
const MarketplaceMapping = require('../models/MarketplaceMapping');
const Product = require('../models/Product');
const { decrypt } = require('../utils/secretManager');
const logger = require('../utils/logger');
const MarketplacePushLog = require('../models/MarketplacePushLog');

const fetch = (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

function decryptField(value) {
  if (!value) return '';
  try {
    return decrypt(value);
  } catch {
    return '';
  }
}

async function getConfig() {
  const doc = await MarketplaceConfig.getSingleton();
  return doc || {};
}

async function getMappings() {
  const mapping = await MarketplaceMapping.findOne().lean();
  return mapping || {};
}

function limitImages(images = [], limit = 5) {
  const list = Array.isArray(images) ? images : [];
  return list.filter(Boolean).slice(0, limit);
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
  return { name: category.name || '', id: category._id ? String(category._id) : '' };
}

function resolveMapping(mappingSection, key) {
  if (!mappingSection || !key) return '';
  return mappingSection[key] || '';
}

function buildTrendyolPayload(products, config, mappings) {
  const feedConfig = config.feedSettings || {};
  const items = [];

  products.forEach((product) => {
    const brandName = getBrand(product, config);
    const categoryInfo = mapCategory(product);
    const brandId = resolveMapping(mappings?.trendyol?.brandMap, brandName);
    const categoryId = resolveMapping(mappings?.trendyol?.categoryMap, categoryInfo.name) || resolveMapping(mappings?.trendyol?.categoryMap, categoryInfo.id);

    if (!brandId) {
      throw new Error(`'${product.name}' ürünü için Trendyol marka eşlemesi bulunamadı. Marka: ${brandName || 'belirtilmemiş'}`);
    }
    if (!categoryId) {
      throw new Error(`'${product.name}' ürünü için Trendyol kategori eşlemesi bulunamadı. Kategori: ${categoryInfo.name || categoryInfo.id || 'belirtilmemiş'}`);
    }

    const { price, listPrice } = computePricing(product);
    const images = limitImages(product.images, feedConfig.imageLimit || 5);

    items.push({
      barcode: product.barcode || product.sku || String(product._id),
      title: product.name,
      productMainId: product.sku || String(product._id),
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
      stockCode: product.sku || String(product._id),
      images: images.map((url, index) => ({ url, order: index + 1 })),
      attributes: []
    });
  });

  return { items };
}

async function pushToTrendyol(products, config) {
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
  const payload = buildTrendyolPayload(products, config, mappings);

  const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
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

function buildHepsiburadaPayload(products, config, mappings) {
  const feedConfig = config.feedSettings || {};
  return products.map((product) => {
    const brandName = getBrand(product, config);
    const categoryInfo = mapCategory(product);
    const brandId = resolveMapping(mappings?.hepsiburada?.brandMap, brandName);
    const categoryId = resolveMapping(mappings?.hepsiburada?.categoryMap, categoryInfo.name) || resolveMapping(mappings?.hepsiburada?.categoryMap, categoryInfo.id);
    if (!brandId) {
      throw new Error(`'${product.name}' ürünü için Hepsiburada marka eşlemesi bulunamadı (${brandName || 'belirtilmemiş'}).`);
    }
    if (!categoryId) {
      throw new Error(`'${product.name}' ürünü için Hepsiburada kategori eşlemesi bulunamadı (${categoryInfo.name || categoryInfo.id || 'belirtilmemiş'}).`);
    }

    const { price, listPrice } = computePricing(product);
    const images = limitImages(product.images, feedConfig.imageLimit || 5);
    return {
      merchantSku: product.sku || String(product._id),
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
      stockCode: product.sku || String(product._id),
      deliveryTime: feedConfig.deliveryDays || 3
    };
  });
}

async function pushToHepsiburada(products, config) {
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
  const items = buildHepsiburadaPayload(products, config, mappings);

  const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `https://omsapi.hepsiburada.com/suppliers/${merchantId}/products/import`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
      'merchantid': merchantId
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

function buildN11SoapProduct(product, config, mappings) {
  const brandName = getBrand(product, config);
  const categoryInfo = mapCategory(product);
  const categoryId = resolveMapping(mappings?.n11?.categoryMap, categoryInfo.name) || resolveMapping(mappings?.n11?.categoryMap, categoryInfo.id);
  if (!categoryId) {
    throw new Error(`'${product.name}' ürünü için N11 kategori eşlemesi bulunamadı (${categoryInfo.name || categoryInfo.id || 'belirtilmemiş'}).`);
  }
  const images = limitImages(product.images, config.feedSettings?.imageLimit || 5)
    .map((url) => `<image>${url}</image>`)
    .join('');
  const { price, listPrice } = computePricing(product);

  return `
    <product>
      <productSellerCode>${product.sku || product._id}</productSellerCode>
      <title>${product.name}</title>
      <description>${product.shortDescription || product.description || ''}</description>
      <category>
        <id>${categoryId}</id>
      </category>
      <price>${price.toFixed(2)}</price>
      <displayPrice>${listPrice.toFixed(2)}</displayPrice>
      <stockItems>
        <stockItem>
          <sellerStockCode>${product.sku || product._id}</sellerStockCode>
          <optionName>${brandName}</optionName>
          <quantity>${Math.max(0, Number(product.stock || 0))}</quantity>
          <dispatchTime>{${config.feedSettings?.deliveryDays || 3}}</dispatchTime>
        </stockItem>
      </stockItems>
      <brand>${brandName || 'Generic'}</brand>
      <images>${images}</images>
    </product>
  `;
}

async function pushToN11(products, config) {
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
  const productXml = buildN11SoapProduct(products[0], config, mappings); // N11 SOAP tek seferde bir ürün destekliyor

  const soapBody = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:urn=\"http://api.n11.com/ws\">
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
      'SOAPAction': 'SaveProduct'
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

async function fetchProducts(productIds = null) {
  const query = { isActive: true };
  if (Array.isArray(productIds) && productIds.length > 0) {
    query._id = { $in: productIds };
  }
  const products = await Product.find(query).populate('category').lean();
  if (!products.length) {
    throw new Error('Aktarılacak ürün bulunamadı.');
  }
  return products;
}

function buildSnippet(payload) {
  if (!payload) return undefined;
  try {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return str.length > 1000 ? `${str.slice(0, 997)}...` : str;
  } catch {
    return undefined;
  }
}

async function pushProducts({ marketplace, productIds = null, adminId }) {
  const startedAt = Date.now();
  let products = [];

  try {
    products = await fetchProducts(productIds);
    const config = await getConfig();
    let result;

    switch (marketplace) {
      case 'trendyol':
        result = await pushToTrendyol(products, config);
        break;
      case 'hepsiburada':
        result = await pushToHepsiburada(products, config);
        break;
      case 'n11':
        result = await pushToN11(products, config);
        break;
      default:
        throw new Error(`Desteklenmeyen pazaryeri: ${marketplace}`);
    }

    const durationMs = Date.now() - startedAt;
    const log = await MarketplacePushLog.create({
      marketplace,
      status: 'success',
      requestCount: result.requestCount || 0,
      productCount: products.length,
      productIds: products.map((p) => p._id),
      triggeredBy: adminId,
      durationMs,
      response: result.response || null,
      responseSnippet: buildSnippet(result.response),
      meta: {
        productIds: Array.isArray(productIds) ? productIds : undefined
      },
      triggeredAt: new Date()
    });

    return {
      ...result,
      productCount: products.length,
      durationMs,
      logId: log._id,
      log
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    try {
      await MarketplacePushLog.create({
        marketplace,
        status: 'error',
        requestCount: 0,
        productCount: products.length,
        productIds: products.map((p) => p._id),
        triggeredBy: adminId,
        durationMs,
        errorMessage: error.message,
        errorStack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        response: error.response || null,
        responseSnippet: buildSnippet(error.response || error.message),
        meta: {
          productIds: Array.isArray(productIds) ? productIds : undefined
        },
        triggeredAt: new Date()
      });
    } catch (logError) {
      logger.error('Marketplace push log kaydedilemedi', {
        marketplace,
        logError: logError.message
      });
    }

    throw error;
  }
}

module.exports = {
  pushProducts
};

