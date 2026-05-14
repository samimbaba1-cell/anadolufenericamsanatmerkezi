/* eslint-disable no-console */
const path = require('path');
const { sequelize, testConnection } = require('../src/config/database');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const Product = require('../src/models/Product');

const BASE_URL = process.env.WEBHOOK_TEST_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_SKU = process.env.WEBHOOK_TEST_SKU || 'WEBHOOK-TEST-SKU';
const TEST_PRICE = Number(process.env.WEBHOOK_TEST_PRICE || 99.9);
const TEST_STOCK = Number(process.env.WEBHOOK_TEST_STOCK || 25);
const TEST_BARCODE = process.env.WEBHOOK_TEST_BARCODE || '1234567890123';

async function ensureDatabase() {
  try {
    const connected = await testConnection();
    return connected;
  } catch (err) {
    console.warn('⚠️  MySQL bağlantısı kurulamadı:', err.message);
    return false;
  }
}

async function ensureTestProduct() {
  const connected = await ensureDatabase();
  if (!connected) {
    return null;
  }

  const update = {
    name: 'Webhook Test Ürünü',
    description: 'Webhook doğrulama senaryoları için kullanılan test ürünü',
    price: TEST_PRICE,
    stock: TEST_STOCK,
    isActive: true,
    barcode: TEST_BARCODE
  };

  let product = await Product.findOne({ where: { sku: TEST_SKU } });

  if (product) {
    await product.update({
      price: TEST_PRICE,
      stock: TEST_STOCK,
      barcode: TEST_BARCODE,
      isActive: true
    });
  } else {
    product = await Product.create({
      sku: TEST_SKU,
      name: update.name,
      description: update.description,
      price: update.price,
      stock: update.stock,
      isActive: true,
      barcode: TEST_BARCODE
    });
  }

  return product;
}

async function buildMarketplaces(fetchFn) {
  let productSku = TEST_SKU;
  let productPrice = TEST_PRICE;
  let hasRealProduct = false;

  const product = await ensureTestProduct();
  if (product) {
    productSku = product.sku || TEST_SKU;
    productPrice = Number(product.price) || TEST_PRICE;
    hasRealProduct = !!product;
  }

  try {
    const res = await fetchFn(`${BASE_URL}/api/products?limit=1`);
    if (res.ok) {
      const body = await res.json();
      const first = Array.isArray(body.items) ? body.items[0] : body.items || body;
      if (first?.sku) {
        productSku = first.sku;
        productPrice = Number(first.price) || productPrice;
        hasRealProduct = true;
      }
    }
  } catch (error) {
    console.warn('Ürün bilgisi alınamadı, varsayılan değer kullanılacak:', error.message);
  }

  return [
    hasRealProduct,
    {
      key: 'trendyol',
      path: '/api/webhooks/trendyol/orders',
      secret: process.env.TRENDYOL_WEBHOOK_SECRET,
      payload: {
        orderId: `TY-TEST-${Date.now()}`,
        orderNumber: `TY${Math.floor(Math.random() * 100000)}`,
        customer: {
          firstName: 'Test',
          lastName: 'Müşteri',
          phone: '+905551112233'
        },
        shippingAddress: {
          address: 'İstiklal Cd. No:1',
          city: 'İstanbul',
          state: 'Beyoğlu',
          zipCode: '34000',
          country: 'Turkey'
        },
        items: [
          {
            sku: productSku,
            quantity: 1,
            price: productPrice
          }
        ],
        totalAmount: productPrice
      }
    },
    {
      key: 'hepsiburada',
      path: '/api/webhooks/hepsiburada/orders',
      secret: process.env.HEPSIBURADA_WEBHOOK_SECRET,
      payload: {
        orderId: `HB-TEST-${Date.now()}`,
        orderNumber: `HB${Math.floor(Math.random() * 100000)}`,
        customer: {
          firstName: 'Hepsi',
          lastName: 'Burada',
          phone: '+905551112244',
          address: 'Maslak Mah. Test Plaza',
          city: 'İstanbul',
          state: 'Sarıyer',
          zipCode: '34398',
          country: 'Turkey'
        },
        items: [
          {
            merchantSku: productSku,
            quantity: 1,
            price: productPrice
          }
        ],
        totalAmount: productPrice
      }
    },
    {
      key: 'n11',
      path: '/api/webhooks/n11/orders',
      secret: process.env.N11_WEBHOOK_SECRET,
      payload: {
        orderId: `N11-TEST-${Date.now()}`,
        orderNumber: `N11${Math.floor(Math.random() * 100000)}`,
        customer: {
          firstName: 'N11',
          lastName: 'Müşteri',
          phone: '+905551112255',
          address: 'Ankara Cad. No:10',
          city: 'Ankara',
          state: 'Çankaya',
          zipCode: '06000',
          country: 'Turkey'
        },
        products: [
          {
            stockCode: productSku,
            quantity: 1,
            price: productPrice
          }
        ],
        totalAmount: productPrice
      }
    }
  ];
}

async function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

async function postWebhook(fetchFn, { key, path: endpoint, secret, payload }) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json'
  };

  if (secret) {
    headers['x-webhook-signature'] = secret;
  }

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const bodyText = await res.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }

    return {
      marketplace: key,
      status: res.status,
      ok: res.ok,
      body,
      signature: secret ? 'header' : 'not set'
    };
  } catch (error) {
    return {
      marketplace: key,
      ok: false,
      error: error.message
    };
  }
}

async function main() {
  const fetchFn = await ensureFetch();
  const [hasRealProduct, ...marketplaces] = await buildMarketplaces(fetchFn);

  console.log('🔔 Webhook doğrulama başlatılıyor...');
  console.log(`   Base URL : ${BASE_URL}`);
  console.log('------------------------------------------');

  const results = [];

  for (const marketplace of marketplaces) {
    const result = await postWebhook(fetchFn, marketplace);
    results.push(result);
  }

  const testResponse = await postWebhook(fetchFn, {
    key: 'test',
    path: '/api/webhooks/test',
    payload: { hello: 'world' }
  });
  results.push(testResponse);

  for (const result of results) {
    if (result.ok) {
      console.log(`✅ ${result.marketplace.toUpperCase()} -> ${result.status} (${result.signature || ''})`);
    } else if (result.status) {
      console.log(`⚠️  ${result.marketplace.toUpperCase()} -> ${result.status}`);
      console.log(`    Yanıt: ${JSON.stringify(result.body).slice(0, 300)}`);
    } else {
      console.log(`❌ ${result.marketplace.toUpperCase()} -> ${result.error}`);
    }
  }

  const failures = results.filter(r => !r.ok);
  if (failures.length > 0) {
    console.log('⚠️  Bazı webhook kontrolleri başarısız oldu. Logları kontrol edin.');
    if (!hasRealProduct) {
      console.log('ℹ️  Dikkat: Test ürünü oluşturuldu. Komutu tekrar çalıştırabilirsiniz.');
    }
    process.exitCode = 1;
  } else {
    console.log('🎉 Tüm webhook endpointleri başarıyla yanıt verdi.');
  }
}

main()
  .catch((err) => {
    console.error('Webhook doğrulaması sırasında hata:', err);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });

