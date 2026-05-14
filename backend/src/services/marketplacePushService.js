const MarketplaceConfig = require('../models/MarketplaceConfig');
const MarketplaceMapping = require('../models/MarketplaceMapping');
const Product = require('../models/Product');
const MarketplacePushLog = require('../models/MarketplacePushLog');
const { decrypt } = require('../utils/secretManager');
const logger = require('../utils/logger');
const marketplaceAdapters = require('./marketplaceAdapters');

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
  return doc && typeof doc.toJSON === 'function' ? doc.toJSON() : doc || {};
}

async function getMappings() {
  const mapping = await MarketplaceMapping.findOne();
  return mapping ? mapping.toJSON() : {};
}

async function fetchProducts(productIds = null) {
  const where = { isActive: true };
  if (Array.isArray(productIds) && productIds.length > 0) {
    where.id = productIds;
  }
  const products = await Product.findAll({
    where,
    include: [{ model: require('../models/Category'), as: 'category' }]
  });
  if (!products.length) {
    throw new Error('Aktarılacak ürün bulunamadı.');
  }
  return products.map((p) => p.toJSON());
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
    const adapter = marketplaceAdapters.getAdapter(marketplace);
    if (!adapter) {
      throw new Error(`Desteklenmeyen pazaryeri: ${marketplace}`);
    }

    const siteOrigin = (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.STOREFRONT_PUBLIC_URL ||
      ''
    ).replace(/\/+$/, '');

    const ctx = {
      decryptField,
      getMappings,
      fetch,
      siteOrigin
    };

    const result = await adapter.push(products, config, ctx);

    const durationMs = Date.now() - startedAt;
    const log = await MarketplacePushLog.create({
      marketplace,
      status: 'success',
      requestCount: result.requestCount || 0,
      productCount: products.length,
      productIds: products.map((p) => p.id || p._id),
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
      logId: log.id,
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
        productIds: products.map((p) => p.id || p._id),
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

function listRegisteredMarketplaces() {
  return marketplaceAdapters.listProviders();
}

module.exports = {
  pushProducts,
  listRegisteredMarketplaces
};
