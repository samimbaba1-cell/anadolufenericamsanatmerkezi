const path = require('path');
const fs = require('fs').promises;
const SeoSettings = require('../models/SeoSettings');
const Product = require('../models/Product');
const contentService = require('./contentService');
const settingsService = require('./settingsService');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

const PUBLIC_DIR = path.resolve(__dirname, '../../public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

const DEFAULTS = {
  siteTitle: 'Anadolu Feneri Cam Sanat Merkezi | El Yapımı Cam Sanat Eserleri',
  siteDescription:
    'El yapımı cam sanat eserleri, dekoratif cam ürünler ve özgün tasarımlar. Güvenli ödeme, özenli paketleme ve hızlı kargo. Türkiye geneli online satış.',
  keywords:
    'cam sanat, el yapımı cam, cam vazo, dekoratif cam, Anadolu Feneri, cam hediyelik, online cam mağaza, cam sanat merkezi',
  ogTitle: 'Anadolu Feneri Cam Sanat Merkezi — El Yapımı Cam Ürünler',
  ogDescription:
    'Özgün cam sanat eserlerini keşfedin. Güvenli alışveriş, hızlı teslimat ve müşteri memnuniyeti odaklı hizmet.',
  ogImage: '',
  twitterCard: 'summary_large_image',
  twitterSite: '@anadolufenericam',
  twitterCreator: '@anadolufenericam',
  robots: 'index, follow',
  canonicalUrl: '',
  sitemapUrl: '/sitemap.xml',
  googleAnalytics: '',
  googleSearchConsole: '',
  facebookPixel: '',
  customHead: '',
  customFooter: ''
};

function mergeDefaults(data = {}) {
  return { ...DEFAULTS, ...data };
}

async function loadSeoSettings(force = false) {
  const now = Date.now();
  if (!force && cache && now - cacheTime < CACHE_TTL) {
    return cache;
  }

  let doc = await SeoSettings.getSingleton();
  if (!doc) {
    doc = await SeoSettings.create(DEFAULTS);
  }

  cache = mergeDefaults(doc);
  cacheTime = now;
  return cache;
}

async function getSeoSettings(options = {}) {
  return loadSeoSettings(options.force);
}

async function updateSeoSettings(payload, adminId) {
  const existing = await loadSeoSettings();
  const next = mergeDefaults({ ...existing, ...payload, updatedBy: adminId });

  const [updated] = await SeoSettings.upsert(next, {
    returning: true
  });

  cache = mergeDefaults(updated);
  cacheTime = Date.now();
  return cache;
}

async function ensurePublicDir() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
}

function getBaseUrl(settings) {
  if (settings.canonicalUrl) {
    return settings.canonicalUrl.replace(/\/$/, '');
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }
  return 'http://localhost:3001';
}

function createXmlUrl({ loc, lastmod, changefreq = 'weekly', priority = '0.5' }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function generateSitemap(adminId) {
  const seoSettings = await loadSeoSettings();
  const siteSettings = await settingsService.getSettings();
  const baseUrl = getBaseUrl(seoSettings) || getBaseUrl(siteSettings.seo || {});
  const now = new Date();

  const urls = [];
  urls.push(createXmlUrl({ loc: baseUrl, lastmod: now.toISOString(), changefreq: 'daily', priority: '1.0' }));

  const products = await Product.findAll({
    where: { isActive: true },
    attributes: ['id', 'updatedAt', 'createdAt']
  });
  products.forEach((product) => {
    urls.push(createXmlUrl({
      loc: `${baseUrl}/product/${product.id}`,
      lastmod: (product.updatedAt || product.createdAt || now).toISOString(),
      changefreq: 'daily',
      priority: '0.8'
    }));
  });

  const content = await contentService.getContent().catch(() => null);
  if (content) {
    urls.push(createXmlUrl({
      loc: `${baseUrl}/about`,
      lastmod: now.toISOString(),
      changefreq: 'monthly',
      priority: '0.6'
    }));
    urls.push(createXmlUrl({
      loc: `${baseUrl}/contact`,
      lastmod: now.toISOString(),
      changefreq: 'monthly',
      priority: '0.6'
    }));
  }

  await ensurePublicDir();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  await fs.writeFile(SITEMAP_PATH, xml, 'utf8');

  await updateSeoSettings({ sitemapUrl: seoSettings.sitemapUrl || '/sitemap.xml' }, adminId);

  return {
    sitemapUrl: seoSettings.sitemapUrl || '/sitemap.xml',
    totalPages: urls.length,
    generatedAt: now
  };
}

async function getSitemapStatus() {
  try {
    const stats = await fs.stat(SITEMAP_PATH);
    return {
      status: 'active',
      lastGenerated: stats.mtime,
      totalPages: 0,
      sitemapUrl: '/sitemap.xml'
    };
  } catch (_error) {
    return {
      status: 'not_found',
      lastGenerated: null,
      totalPages: 0,
      sitemapUrl: '/sitemap.xml'
    };
  }
}

function buildRobotsTxt(seoSettings) {
  const baseUrl = getBaseUrl(seoSettings);
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /uploads/`;
}

async function getRobotsTxt() {
  const seoSettings = await loadSeoSettings();
  return buildRobotsTxt(seoSettings);
}

module.exports = {
  getSeoSettings,
  updateSeoSettings,
  generateSitemap,
  getSitemapStatus,
  getRobotsTxt
};

