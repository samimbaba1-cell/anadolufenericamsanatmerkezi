/* eslint-disable no-console */
const path = require('path');

if (!process.env.FEED_TOKEN) {
  require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
  });
}

const FEED_TOKEN = process.env.FEED_TOKEN || process.env.FEED_TEST_TOKEN;
const BASE_URL = process.env.FEED_TEST_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

const feeds = [
  { key: 'trendyol.xml', label: 'Trendyol' },
  { key: 'hepsiburada.xml', label: 'Hepsiburada' },
  { key: 'n11.xml', label: 'N11' }
];

async function ensureFetch() {
  if (typeof fetch === 'function') {
    return fetch;
  }
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
}

async function checkFeed(fetchFn, feed) {
  const url = `${BASE_URL}/api/feeds/${feed.key}${FEED_TOKEN ? `?token=${encodeURIComponent(FEED_TOKEN)}` : ''}`;
  const started = Date.now();
  try {
    const res = await fetchFn(url, {
      headers: {
        Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8'
      }
    });

    const duration = Date.now() - started;
    const contentType = res.headers.get('content-type') || '';
    const productCount = res.headers.get('x-product-count');
    const totalItems = res.headers.get('x-total-items');

    if (!res.ok) {
      const body = await res.text();
      return {
        feed: feed.label,
        status: res.status,
        ok: false,
        duration,
        contentType,
        info: body.slice(0, 300)
      };
    }

    return {
      feed: feed.label,
      status: res.status,
      ok: true,
      duration,
      contentType,
      productCount,
      totalItems
    };
  } catch (error) {
    return {
      feed: feed.label,
      ok: false,
      error: error.message
    };
  }
}

async function main() {
  const fetchFn = await ensureFetch();

  if (!FEED_TOKEN) {
    console.warn('⚠️  FEED_TOKEN bulunamadı. Üretim ortamında token olmadan istekler reddedilecektir.');
  }

  console.log('🔍 Feed doğrulama başlatılıyor...');
  console.log(`   Base URL : ${BASE_URL}`);
  console.log(`   Token    : ${FEED_TOKEN ? '[ayarlı]' : '[ayarlı değil]'}`);
  console.log('------------------------------------------');

  const results = [];
  for (const feed of feeds) {
    const result = await checkFeed(fetchFn, feed);
    results.push(result);
  }

  for (const result of results) {
    if (result.ok) {
      console.log(`✅ ${result.feed} -> ${result.status} | ürün:${result.productCount || '-'} | item:${result.totalItems || '-'} | ${result.duration}ms`);
    } else if (result.status) {
      console.log(`⚠️  ${result.feed} -> ${result.status} (${result.duration}ms)`);
      if (result.info) {
        console.log(`    yanıt: ${result.info}`);
      }
    } else {
      console.log(`❌ ${result.feed} -> ${result.error}`);
    }
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  } else {
    console.log('🎉 Tüm feed endpointleri başarıyla yanıt verdi.');
  }
}

main().catch((err) => {
  console.error('Feed doğrulaması sırasında hata:', err);
  process.exit(1);
});

