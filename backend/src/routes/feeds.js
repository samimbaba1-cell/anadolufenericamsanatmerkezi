const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const MarketplaceMapping = require('../models/MarketplaceMapping');
const FeedStats = require('../models/FeedStats');
const MarketplaceConfig = require('../models/MarketplaceConfig');
const logger = require('../utils/logger');

let configCache = null;
let configCacheAt = 0;
const CONFIG_TTL = 60 * 1000; // 1 minute

async function getMarketplaceConfig(force = false) {
  const now = Date.now();
  if (!configCache || force || now - configCacheAt > CONFIG_TTL) {
    configCache = await MarketplaceConfig.getSingleton();
    configCacheAt = now;
  }
  return configCache;
}

function getFeedConfig(configDoc) {
  const envDefaults = {
    vat: Number(process.env.FEED_VAT_DEFAULT || 20),
    currency: process.env.FEED_CURRENCY || 'TRY',
    deliveryDays: Number(process.env.FEED_DELIVERY_DAYS || 3),
    imageLimit: Number(process.env.FEED_IMAGE_LIMIT || 10),
    brandKeys: (process.env.FEED_BRAND_KEYS || 'brand,marka')
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)
  };

  const overrides = configDoc?.feedSettings || {};
  const brandKeys = Array.isArray(overrides.brandKeys) && overrides.brandKeys.length
    ? overrides.brandKeys.map(k => String(k).toLowerCase())
    : envDefaults.brandKeys;

  return {
    vat: overrides.vat ?? envDefaults.vat,
    currency: overrides.currency || envDefaults.currency,
    deliveryDays: overrides.deliveryDays ?? envDefaults.deliveryDays,
    imageLimit: overrides.imageLimit ?? envDefaults.imageLimit,
    brandKeys
  };
}

function escapeXml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getBrandFromAttributes(product, configDoc) {
  try {
    const { brandKeys } = getFeedConfig(configDoc);
    const attr = product.attributes?.find?.(a => a?.name && brandKeys.includes(String(a.name).toLowerCase()));
    return attr?.value || '';
  } catch (e) {
    return '';
  }
}

/**
 * Marketplace bazlı fiyat hesaplama
 * @param {Object} product - Ürün objesi
 * @param {String} marketplace - Pazaryeri adı (trendyol, hepsiburada, n11)
 * @returns {Object} { price, listPrice, discount }
 */
function computePricing(product, marketplace = null) {
  let price = Number(product.price || 0);
  let listPrice = Number(product.originalPrice || price);
  
  // Marketplace özel fiyatlandırma varsa kullan
  if (marketplace && product.marketplacePricing && product.marketplacePricing[marketplace]) {
    const mpPricing = product.marketplacePricing[marketplace];
    
    // Pazaryeri bu ürün için devre dışıysa skip
    if (mpPricing.enabled === false) {
      return null;
    }
    
    // Özel fiyat varsa kullan
    if (mpPricing.price && mpPricing.price > 0) {
      price = Number(mpPricing.price);
    }
    
    // Komisyon varsa ekle
    if (mpPricing.commission && mpPricing.commission > 0) {
      price = price * (1 + mpPricing.commission / 100);
    }
    
    // Aktif kampanya varsa kontrol et
    if (mpPricing.campaign && mpPricing.campaign.enabled) {
      const now = new Date();
      const start = mpPricing.campaign.startDate ? new Date(mpPricing.campaign.startDate) : null;
      const end = mpPricing.campaign.endDate ? new Date(mpPricing.campaign.endDate) : null;
      
      const isActive = (!start || now >= start) && (!end || now <= end);
      
      if (isActive && mpPricing.campaign.campaignPrice) {
        listPrice = price; // Normal fiyat liste fiyatı olur
        price = Number(mpPricing.campaign.campaignPrice);
      }
    }
  }
  
  const discount = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  return { price, listPrice, discount };
}

/**
 * Resim URL validasyonu
 * Boş, geçersiz veya erişilemeyen resimleri filtreler
 */
function validateImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // URL formatı kontrolü
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  } catch {
    return false;
  }
  
  // Geçerli resim uzantıları
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const urlLower = url.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => urlLower.includes(ext));
  
  return hasValidExtension || urlLower.includes('/images/') || urlLower.includes('/upload');
}

function limitImages(images, configDoc) {
  const { imageLimit } = getFeedConfig(configDoc);
  const list = Array.isArray(images) ? images : [];
  
  // Geçerli resimleri filtrele
  const validImages = list.filter(validateImageUrl);
  
  if (validImages.length < list.length) {
    logger.warn('Bazı resimler geçersiz olduğu için filtrelendi', {
      total: list.length,
      valid: validImages.length,
      invalid: list.length - validImages.length
    });
  }
  
  return validImages.slice(0, Math.max(0, imageLimit));
}

/**
 * Tek bir ürün için XML item oluştur (Trendyol)
 */
function buildTrendyolItem(product, variant = null, mappings = {}, configDoc = null) {
  const { vat, currency, deliveryDays } = getFeedConfig(configDoc);
  const limited = limitImages(product.images, configDoc);
  const imageUrl = limited.length > 0 ? limited[0] : '';
  const images = limited.map(url => `        <image>${escapeXml(url)}</image>`).join('\n');
  const brand = getBrandFromAttributes(product, configDoc);
  const categoryName = product.category?.name || '';
  const brandId = mappings?.trendyol?.brandMap && brand ? (mappings.trendyol.brandMap[brand] || '') : '';
  const categoryId = mappings?.trendyol?.categoryMap && categoryName ? (mappings.trendyol.categoryMap[categoryName] || '') : '';
  
  // Varyant varsa onun bilgilerini kullan, yoksa ana ürünün
  let productName = product.name;
  let stockCode, barcode, price, listPrice, discount, stock, availability;
  
  if (variant) {
    productName = `${product.name} - ${variant.name}`;
    stockCode = variant.sku || `${product.sku || product._id}-${variant.name}`;
    barcode = variant.barcode || '';
    const variantPrice = Number(variant.price || product.price || 0);
    const variantListPrice = Number(variant.originalPrice || product.originalPrice || variantPrice);
    price = variantPrice;
    listPrice = variantListPrice;
    discount = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
    stock = Math.max(0, Number(variant.stock || 0));
    availability = stock > 0 ? 'in_stock' : 'out_of_stock';
  } else {
    stockCode = product.sku || String(product._id);
    barcode = product.sku || '';
    const pricing = computePricing(product, 'trendyol');
    
    // Pazaryeri bu ürün için devre dışıysa skip
    if (!pricing) return null;
    
    price = pricing.price;
    listPrice = pricing.listPrice;
    discount = pricing.discount;
    stock = Math.max(0, Number(product.stock || 0));
    availability = stock > 0 ? 'in_stock' : 'out_of_stock';
  }
  
  return `    <item>
      <title>${escapeXml(productName)}</title>
      <description>${escapeXml(product.shortDescription || product.description || '')}</description>
      <price>${price.toFixed(2)}</price>
      <listPrice>${listPrice.toFixed(2)}</listPrice>
      <discountPercent>${discount}</discountPercent>
      <brand>${escapeXml(brand)}</brand>
      ${brandId ? `<brandId>${escapeXml(brandId)}</brandId>` : ''}
      <productCode>${escapeXml(stockCode)}</productCode>
      <barcode>${escapeXml(barcode)}</barcode>
      <stock>${stock}</stock>
      <image>${escapeXml(imageUrl)}</image>
      <images>
${images}
      </images>
      <vat>${vat}</vat>
      <currency>${currency}</currency>
      <deliveryTime>${deliveryDays}</deliveryTime>
      <availability>${availability}</availability>
      <category>${escapeXml(categoryName)}</category>
      ${categoryId ? `<categoryId>${escapeXml(categoryId)}</categoryId>` : ''}
    </item>`;
}

function buildTrendyolXml(products, mappings, configDoc) {
  const items = [];
  
  products.forEach((p) => {
    // Ürünün varyantları varsa her varyant için ayrı item
    if (p.variants && Array.isArray(p.variants) && p.variants.length > 0) {
      p.variants.forEach(variant => {
        const item = buildTrendyolItem(p, variant, mappings, configDoc);
        if (item) items.push(item); // null değilse ekle (marketplace disabled olmayabilir)
      });
    } else {
      // Varyant yoksa normal ürün
      const item = buildTrendyolItem(p, null, mappings, configDoc);
      if (item) items.push(item);
    }
  });
  
  return `<?xml version="1.0" encoding="UTF-8"?>\n<items>\n${items.join('\n')}\n</items>`;
}

function buildHepsiburadaXml(products, mappings, configDoc) {
  const items = products.map((p) => {
    const { vat, currency, deliveryDays } = getFeedConfig(configDoc);
    const limited = limitImages(p.images, configDoc);
    const imageUrl = limited.length > 0 ? limited[0] : '';
    const merchantSku = p.sku || String(p._id);
    const images = limited.map(url => `        <imageUrl>${escapeXml(url)}</imageUrl>`).join('\n');
    const brand = getBrandFromAttributes(p, configDoc);
    const { price, listPrice, discount } = computePricing(p);
    const availability = (Number(p.stock || 0) > 0) ? 'in_stock' : 'out_of_stock';
    const deliveryTime = deliveryDays;
    const categoryName = p.category?.name || '';
    const brandId = mappings?.hepsiburada?.brandMap && brand ? (mappings.hepsiburada.brandMap[brand] || '') : '';
    const categoryId = mappings?.hepsiburada?.categoryMap && categoryName ? (mappings.hepsiburada.categoryMap[categoryName] || '') : '';
    return `    <item>
      <merchantSku>${escapeXml(merchantSku)}</merchantSku>
      <productName>${escapeXml(p.name)}</productName>
      <description>${escapeXml(p.shortDescription || p.description || '')}</description>
      <price>${price.toFixed(2)}</price>
      <listPrice>${listPrice.toFixed(2)}</listPrice>
      <discountPercent>${discount}</discountPercent>
      <quantity>${Math.max(0, Number(p.stock || 0))}</quantity>
      <imageUrl>${escapeXml(imageUrl)}</imageUrl>
      <images>
${images}
      </images>
      <brand>${escapeXml(brand)}</brand>
      ${brandId ? `<brandId>${escapeXml(brandId)}</brandId>` : ''}
      <vat>${vat}</vat>
      <currency>${currency}</currency>
      <deliveryTime>${deliveryTime}</deliveryTime>
      <availability>${availability}</availability>
      <category>${escapeXml(categoryName)}</category>
      ${categoryId ? `<categoryId>${escapeXml(categoryId)}</categoryId>` : ''}
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<items>\n${items}\n</items>`;
}

function buildN11Xml(products, mappings, configDoc) {
  const items = products.map((p) => {
    const { vat, currency } = getFeedConfig(configDoc);
    const limited = limitImages(p.images, configDoc);
    const imageUrl = limited.length > 0 ? limited[0] : '';
    const stockCode = p.sku || String(p._id);
    const images = limited.map(url => `        <image>${escapeXml(url)}</image>`).join('\n');
    const brand = getBrandFromAttributes(p, configDoc);
    const { price, listPrice, discount } = computePricing(p);
    const availability = (Number(p.stock || 0) > 0) ? 'in_stock' : 'out_of_stock';
    const categoryName = p.category?.name || '';
    const brandId = mappings?.n11?.brandMap && brand ? (mappings.n11.brandMap[brand] || '') : '';
    const categoryId = mappings?.n11?.categoryMap && categoryName ? (mappings.n11.categoryMap[categoryName] || '') : '';
    return `    <product>
      <stockCode>${escapeXml(stockCode)}</stockCode>
      <name>${escapeXml(p.name)}</name>
      <description>${escapeXml(p.shortDescription || p.description || '')}</description>
      <price>${price.toFixed(2)}</price>
      <listPrice>${listPrice.toFixed(2)}</listPrice>
      <discountPercent>${discount}</discountPercent>
      <quantity>${Math.max(0, Number(p.stock || 0))}</quantity>
      <brand>${escapeXml(brand)}</brand>
      ${brandId ? `<brandId>${escapeXml(brandId)}</brandId>` : ''}
      <vat>${vat}</vat>
      <currency>${currency}</currency>
      <availability>${availability}</availability>
      <category>${escapeXml(categoryName)}</category>
      ${categoryId ? `<categoryId>${escapeXml(categoryId)}</categoryId>` : ''}
      <images>
${images}
      </images>
      <image>${escapeXml(imageUrl)}</image>
    </product>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n${items}\n</products>`;
}

/**
 * Feed token kontrolü - Güvenlik
 * Token yoksa hata döner (production güvenliği)
 */
async function checkFeedToken(req, res, configDoc) {
  const expected = (configDoc && configDoc.feedToken) || process.env.FEED_TOKEN;
  
  // Token tanımlanmamışsa development'da izin ver, production'da hata
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('FEED_TOKEN tanımlanmamış! Production ortamında token gereklidir.');
      res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Feed token yapılandırılmamış' 
      });
      return false;
    }
    logger.warn('FEED_TOKEN tanımlanmamış, development modunda devam ediliyor');
    return true;
  }
  
  const provided = req.query.token || req.headers['x-feed-token'];
  
  if (!provided || provided !== expected) {
    logger.warn('Unauthorized feed access attempt', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path
    });
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Geçersiz token' 
    });
    return false;
  }
  
  return true;
}

router.get('/trendyol.xml', async (req, res) => {
  const configDoc = await getMarketplaceConfig();
  if (!await checkFeedToken(req, res, configDoc)) return;
  
  const startTime = Date.now();
  
  try {
    logger.info('Trendyol feed oluşturuluyor...');
    
    const products = await Product.findAll({
      where: { isActive: true },
      include: [
        { model: Category, as: 'category', required: false }
      ]
    });
    const mappingsDoc = await MarketplaceMapping.findOne();
    const mappings = mappingsDoc ? mappingsDoc.toJSON() : {};
    
    if (!products || products.length === 0) {
      logger.warn('Trendyol feed: Aktif ürün bulunamadı');
      res.set('Content-Type', 'application/xml; charset=utf-8');
      return res.send('<?xml version="1.0" encoding="UTF-8"?>\n<items>\n  <!-- No active products -->\n</items>');
    }
    
    const productsJson = products.map(p => p.toJSON());
    const xml = buildTrendyolXml(productsJson, mappings || {}, configDoc);
    
    const duration = Date.now() - startTime;
    
    // Count total items (products + variants)
    const totalItems = products.reduce((sum, p) => {
      return sum + (p.variants && p.variants.length > 0 ? p.variants.length : 1);
    }, 0);
    
    logger.info('Trendyol feed başarıyla oluşturuldu', {
      productCount: products.length,
      totalItems,
      duration: `${duration}ms`
    });
    
    // Record stats
    FeedStats.recordGeneration('trendyol', {
      productsExported: products.length,
      variantsExported: totalItems - products.length,
      generationTime: duration,
      accessedBy: {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    }).catch(err => logger.error('Stats kayıt hatası:', err));
    
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('X-Product-Count', products.length);
    res.set('X-Total-Items', totalItems);
    res.set('X-Generation-Time', `${duration}ms`);
    res.send(xml);
    
  } catch (err) {
    logger.error('Trendyol feed oluşturma hatası', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({ 
      error: 'Feed oluşturulamadı',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
    });
  }
});

router.get('/hepsiburada.xml', async (req, res) => {
  const configDoc = await getMarketplaceConfig();
  if (!await checkFeedToken(req, res, configDoc)) return;
  
  const startTime = Date.now();
  
  try {
    logger.info('Hepsiburada feed oluşturuluyor...');
    
    const products = await Product.findAll({
      where: { isActive: true },
      include: [
        { model: Category, as: 'category', required: false }
      ]
    });
    const mappingsDoc = await MarketplaceMapping.findOne();
    const mappings = mappingsDoc ? mappingsDoc.toJSON() : {};
    
    if (!products || products.length === 0) {
      logger.warn('Hepsiburada feed: Aktif ürün bulunamadı');
      res.set('Content-Type', 'application/xml; charset=utf-8');
      return res.send('<?xml version="1.0" encoding="UTF-8"?>\n<items>\n  <!-- No active products -->\n</items>');
    }
    
    const productsJson = products.map(p => p.toJSON());
    const xml = buildHepsiburadaXml(productsJson, mappings || {}, configDoc);
    
    const duration = Date.now() - startTime;
    logger.info('Hepsiburada feed başarıyla oluşturuldu', {
      productCount: products.length,
      duration: `${duration}ms`
    });
    
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('X-Product-Count', products.length);
    res.set('X-Generation-Time', `${duration}ms`);
    res.send(xml);
    
  } catch (err) {
    logger.error('Hepsiburada feed oluşturma hatası', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({ 
      error: 'Feed oluşturulamadı',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
    });
  }
});

router.get('/n11.xml', async (req, res) => {
  const configDoc = await getMarketplaceConfig();
  if (!await checkFeedToken(req, res, configDoc)) return;
  
  const startTime = Date.now();
  
  try {
    logger.info('N11 feed oluşturuluyor...');
    
    const products = await Product.findAll({
      where: { isActive: true },
      include: [
        { model: Category, as: 'category', required: false }
      ]
    });
    const mappingsDoc = await MarketplaceMapping.findOne();
    const mappings = mappingsDoc ? mappingsDoc.toJSON() : {};
    
    if (!products || products.length === 0) {
      logger.warn('N11 feed: Aktif ürün bulunamadı');
      res.set('Content-Type', 'application/xml; charset=utf-8');
      return res.send('<?xml version="1.0" encoding="UTF-8"?>\n<products>\n  <!-- No active products -->\n</products>');
    }
    
    const productsJson = products.map(p => p.toJSON());
    const xml = buildN11Xml(productsJson, mappings || {}, configDoc);
    
    const duration = Date.now() - startTime;
    logger.info('N11 feed başarıyla oluşturuldu', {
      productCount: products.length,
      duration: `${duration}ms`
    });
    
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('X-Product-Count', products.length);
    res.set('X-Generation-Time', `${duration}ms`);
    res.send(xml);
    
  } catch (err) {
    logger.error('N11 feed oluşturma hatası', {
      error: err.message,
      stack: err.stack
    });
    
    res.status(500).json({ 
      error: 'Feed oluşturulamadı',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
    });
  }
});

// Mappings CRUD (simplified: single document)
router.get('/mappings', async (req, res) => {
  const configDoc = await getMarketplaceConfig();
  if (!await checkFeedToken(req, res, configDoc)) return;
  const doc = await MarketplaceMapping.findOne();
  res.json(doc ? doc.toJSON() : {});
});

router.put('/mappings', async (req, res) => {
  const configDoc = await getMarketplaceConfig();
  if (!await checkFeedToken(req, res, configDoc)) return;
  const update = req.body || {};
  let doc = await MarketplaceMapping.findOne();
  if (doc) {
    await doc.update(update);
  } else {
    doc = await MarketplaceMapping.create(update);
  }
  res.json(doc.toJSON());
});

// Feed config endpoint (for admin UI)
router.get('/config', async (req, res) => {
  const configDoc = await getMarketplaceConfig();
  if (!await checkFeedToken(req, res, configDoc)) return;
  const cfg = getFeedConfig(configDoc);
  res.json({
    vatDefault: cfg.vat,
    currency: cfg.currency,
    deliveryDays: cfg.deliveryDays,
    imageLimit: cfg.imageLimit,
    brandKeys: cfg.brandKeys,
  });
});

module.exports = router;


