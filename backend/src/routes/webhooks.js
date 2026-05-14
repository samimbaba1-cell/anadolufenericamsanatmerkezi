const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const logger = require('../utils/logger');
const MarketplaceConfig = require('../models/MarketplaceConfig');

/**
 * Webhook güvenlik kontrolü
 * Pazaryerlerinden gelen istekleri doğrular
 */
let configCache = null;
let configCacheAt = 0;
const CONFIG_TTL = 60 * 1000;

async function getMarketplaceConfig(force = false) {
  const now = Date.now();
  if (!configCache || force || now - configCacheAt > CONFIG_TTL) {
    configCache = await MarketplaceConfig.getSingleton();
    configCacheAt = now;
  }
  return configCache;
}

async function verifyWebhookSignature(req, res, marketplace) {
  const config = await getMarketplaceConfig();
  const secret =
    config?.webhookSecrets?.[marketplace] ||
    process.env[`${marketplace.toUpperCase()}_WEBHOOK_SECRET`];
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!secret) {
    logger.error(`${marketplace} webhook secret tanımlanmamış`);
    if (!isProduction) {
      logger.warn(`${marketplace} webhook secret olmadigi icin development modunda istek kabul edildi`);
      return true;
    }

    return res.status(503).json({ error: 'Webhook yapılandırması eksik' });
  }
  
  const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
  
  if (!signature) {
    logger.warn(`${marketplace} webhook: signature header bulunamadı`);
    return res.status(401).json({ error: 'Signature required' });
  }
  
  const signatureBuffer = Buffer.from(String(signature));
  const secretBuffer = Buffer.from(String(secret));
  if (
    signatureBuffer.length !== secretBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, secretBuffer)
  ) {
    logger.error(`${marketplace} webhook: Invalid signature`);
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  return true;
}

/**
 * Trendyol Webhook - Yeni Sipariş
 * POST /api/webhooks/trendyol/orders
 */
router.post('/trendyol/orders', async (req, res) => {
  if (await verifyWebhookSignature(req, res, 'trendyol') !== true) return;
  
  try {
    const { orderId, orderNumber, customer, items, totalAmount, shippingAddress } = req.body;
    
    logger.info('Trendyol yeni sipariş alındı', {
      orderId,
      orderNumber,
      itemCount: items?.length
    });
    
    const orderItems = [];

    // Stok kontrolü ve güncelleme
    for (const item of items) {
      const product = await Product.findOne({ where: { sku: item.sku } });
      
      if (!product) {
        logger.warn(`Ürün bulunamadı: ${item.sku}`);
        continue;
      }
      
      if (product.stock < item.quantity) {
        logger.error(`Yetersiz stok: ${product.name}`, {
          available: product.stock,
          requested: item.quantity
        });
        continue;
      }
      
      const productToUpdate = await Product.findByPk(product.id || product._id);
      if (productToUpdate) {
        await productToUpdate.update({
          stock: productToUpdate.stock - item.quantity
        });
      }
      
      orderItems.push({
        product: product.id || product._id,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({
        error: 'Order processing error',
        message: 'Sipariş kalemi bulunamadı veya stok yetersiz'
      });
    }
    
    // Sipariş kaydı oluştur
    const order = await Order.create({
      source: 'trendyol',
      externalId: orderId,
      orderNumber: orderNumber || `TY${Date.now()}`,
      items: orderItems,
      subtotal: totalAmount,
      total: totalAmount,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'marketplace',
      shippingAddress: {
        firstName: customer?.firstName || 'Müşteri',
        lastName: customer?.lastName || 'Bilgisi',
        address1: shippingAddress?.address || 'Adres belirtilmedi',
        city: shippingAddress?.city || 'İstanbul',
        state: shippingAddress?.state || 'Merkez',
        zipCode: shippingAddress?.zipCode || '00000',
        country: shippingAddress?.country || 'Turkey',
        phone: customer?.phone || '0000000000'
      }
    });
    
    logger.info('Trendyol siparişi kaydedildi', { orderId: order.id });
    
    res.json({ 
      success: true,
      message: 'Sipariş başarıyla kaydedildi',
      orderId: order.id
    });
    
  } catch (error) {
    logger.error('Trendyol webhook hatası', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Webhook işleme hatası',
      message: process.env.NODE_ENV === 'production' ? 'Webhook işlenemedi' : error.message
    });
  }
});

/**
 * Hepsiburada Webhook - Yeni Sipariş
 * POST /api/webhooks/hepsiburada/orders
 */
router.post('/hepsiburada/orders', async (req, res) => {
  if (await verifyWebhookSignature(req, res, 'hepsiburada') !== true) return;
  
  try {
    const { orderId, orderNumber, customer, items, totalAmount } = req.body;
    
    logger.info('Hepsiburada yeni sipariş alındı', {
      orderId,
      orderNumber,
      itemCount: items?.length
    });
    
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({ where: { sku: item.merchantSku } });
      
      if (!product) {
        logger.warn(`Hepsiburada ürünü bulunamadı: ${item.merchantSku}`);
        continue;
      }

      if (product.stock < item.quantity) {
        logger.error(`Hepsiburada stok yetersiz: ${product.name}`, {
          available: product.stock,
          requested: item.quantity
        });
        continue;
      }

      const productToUpdate = await Product.findByPk(product.id || product._id);
      if (productToUpdate) {
        await productToUpdate.update({
          stock: productToUpdate.stock - item.quantity
        });
      }

      orderItems.push({
        product: product.id || product._id,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({
        error: 'Order processing error',
        message: 'Sipariş kalemi bulunamadı veya stok yetersiz'
      });
    }
    
    const order = await Order.create({
      source: 'hepsiburada',
      externalId: orderId,
      orderNumber: orderNumber || `HB${Date.now()}`,
      items: orderItems,
      subtotal: totalAmount,
      total: totalAmount,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'marketplace',
      shippingAddress: {
        firstName: customer?.firstName || 'Müşteri',
        lastName: customer?.lastName || 'Bilgisi',
        address1: customer?.address || 'Adres belirtilmedi',
        city: customer?.city || 'İstanbul',
        state: customer?.state || 'Merkez',
        zipCode: customer?.zipCode || '00000',
        country: customer?.country || 'Turkey',
        phone: customer?.phone || '0000000000'
      }
    });
    
    logger.info('Hepsiburada siparişi kaydedildi', { orderId: order.id });
    
    res.json({ 
      success: true,
      message: 'Sipariş başarıyla kaydedildi',
      orderId: order.id
    });
    
  } catch (error) {
    logger.error('Hepsiburada webhook hatası', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Webhook işleme hatası',
      message: process.env.NODE_ENV === 'production' ? 'Webhook işlenemedi' : error.message
    });
  }
});

/**
 * N11 Webhook - Yeni Sipariş
 * POST /api/webhooks/n11/orders
 */
router.post('/n11/orders', async (req, res) => {
  if (await verifyWebhookSignature(req, res, 'n11') !== true) return;
  
  try {
    const { orderId, orderNumber, customer, products, totalAmount } = req.body;
    
    logger.info('N11 yeni sipariş alındı', {
      orderId,
      orderNumber,
      productCount: products?.length
    });
    
    const orderItems = [];

    for (const item of products) {
      const product = await Product.findOne({ where: { sku: item.stockCode } });
      
      if (!product) {
        logger.warn(`N11 ürünü bulunamadı: ${item.stockCode}`);
        continue;
      }

      if (product.stock < item.quantity) {
        logger.error(`N11 stok yetersiz: ${product.name}`, {
          available: product.stock,
          requested: item.quantity
        });
        continue;
      }

      const productToUpdate = await Product.findByPk(product.id || product._id);
      if (productToUpdate) {
        await productToUpdate.update({
          stock: productToUpdate.stock - item.quantity
        });
      }

      orderItems.push({
        product: product.id || product._id,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({
        error: 'Order processing error',
        message: 'Sipariş kalemi bulunamadı veya stok yetersiz'
      });
    }
    
    const order = await Order.create({
      source: 'n11',
      externalId: orderId,
      orderNumber: orderNumber || `N11${Date.now()}`,
      items: orderItems,
      subtotal: totalAmount,
      total: totalAmount,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'marketplace',
      shippingAddress: {
        firstName: customer?.firstName || 'Müşteri',
        lastName: customer?.lastName || 'Bilgisi',
        address1: customer?.address || 'Adres belirtilmedi',
        city: customer?.city || 'İstanbul',
        state: customer?.state || 'Merkez',
        zipCode: customer?.zipCode || '00000',
        country: customer?.country || 'Turkey',
        phone: customer?.phone || '0000000000'
      }
    });
    
    logger.info('N11 siparişi kaydedildi', { orderId: order.id });
    
    res.json({ 
      success: true,
      message: 'Sipariş başarıyla kaydedildi',
      orderId: order.id
    });
    
  } catch (error) {
    logger.error('N11 webhook hatası', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Webhook işleme hatası',
      message: process.env.NODE_ENV === 'production' ? 'Webhook işlenemedi' : error.message
    });
  }
});

/**
 * Webhook test endpoint
 * POST /api/webhooks/test
 */
router.post('/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  logger.info('Webhook test request alındı', {
    body: req.body,
    headers: req.headers
  });
  
  res.json({
    success: true,
    message: 'Webhook test başarılı',
    received: req.body
  });
});

module.exports = router;

