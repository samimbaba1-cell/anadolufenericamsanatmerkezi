const { slugifyTr, normalizeSlugKey, slugsMatch, safeDecodeURIComponent } = require('./slugify');

const CATEGORY_EN_BY_TR_SLUG = {
  kolyeler: { name: 'Necklaces', slug: 'necklaces' },
  bileklikler: { name: 'Bracelets', slug: 'bracelets' },
  yuzukler: { name: 'Rings', slug: 'rings' },
  'su-bardaklari': { name: 'Water Glasses', slug: 'water-glasses' },
  '3-lu-set-figurler': { name: '3-Piece Figure Sets', slug: '3-piece-figure-sets' },
  '3-lü-set-figürler': { name: '3-Piece Figure Sets', slug: '3-piece-figure-sets' },
  'sevgililer-gunu': { name: "Valentine's Day", slug: 'valentines-day' },
  'limonata-bardaklari': { name: 'Lemonade Glasses', slug: 'lemonade-glasses' },
  'raki-bardaklari': { name: 'Raki Glasses', slug: 'raki-glasses' },
  'cam-pipetleri': { name: 'Glass Straws', slug: 'glass-straws' },
  kupeler: { name: 'Earrings', slug: 'earrings' },
  'cam-figurler': { name: 'Glass Figures', slug: 'glass-figures' },
  'cam-agaclar': { name: 'Glass Trees', slug: 'glass-trees' },
  'cam-figürler': { name: 'Glass Figures', slug: 'glass-figures' },
  'cam-ağaçlar': { name: 'Glass Trees', slug: 'glass-trees' }
};

const EN_SLUG_TO_TR_SLUG = Object.fromEntries(
  Object.entries(CATEGORY_EN_BY_TR_SLUG).map(([tr, { slug }]) => [slug, tr])
);

function transliterateTrToAscii(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

function slugifyEn(input) {
  return transliterateTrToAscii(input)
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getCategoryTrSlug(json) {
  if (!json) return null;
  if (json.name) {
    const fromName = slugifyTr(json.name);
    if (fromName) return fromName;
  }
  if (json.slug) return slugifyTr(json.slug);
  return null;
}

function getCategoryEnSlug(json) {
  if (!json) return null;
  if (json.slugEn && String(json.slugEn).trim()) return slugifyEn(json.slugEn);
  if (json.nameEn && String(json.nameEn).trim()) return slugifyEn(json.nameEn);
  const trSlug = getCategoryTrSlug(json);
  const mapped = trSlug ? CATEGORY_EN_BY_TR_SLUG[normalizeSlugKey(trSlug)] : null;
  if (mapped && mapped.slug) return mapped.slug;
  if (json.name) return slugifyEn(json.name);
  return trSlug ? slugifyEn(trSlug) : null;
}

function findCategoryBySlugInList(categoryRows, rawSlug) {
  const decoded = safeDecodeURIComponent(rawSlug);

  if (/^\d+$/.test(decoded)) {
    const byId = categoryRows.find((row) => {
      const json = row.toJSON ? row.toJSON() : row;
      return String(json.id) === decoded;
    });
    if (byId) return byId;
  }

  const target = normalizeSlugKey(decoded);

  const byEnSlug = categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    const enSlug = getCategoryEnSlug(json);
    return enSlug && normalizeSlugKey(enSlug) === target;
  });
  if (byEnSlug) return byEnSlug;

  const trFromEn = EN_SLUG_TO_TR_SLUG[target];
  if (trFromEn) {
    const byEnMap = categoryRows.find((row) => {
      const json = row.toJSON ? row.toJSON() : row;
      const trSlug = getCategoryTrSlug(json);
      return trSlug && normalizeSlugKey(trSlug) === normalizeSlugKey(trFromEn);
    });
    if (byEnMap) return byEnMap;
  }

  return categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    if (json.name && normalizeSlugKey(json.name) === target) return true;
    if (json.slug && slugsMatch(decoded, json.slug)) return true;
    if (json.name && slugsMatch(decoded, json.name)) return true;
    return false;
  });
}

module.exports = {
  CATEGORY_EN_BY_TR_SLUG,
  getCategoryTrSlug,
  getCategoryEnSlug,
  getCategoryDisplayName(json, locale = 'tr') {
    if (!json) return '';
    if (locale === 'en') {
      if (json.nameEn && String(json.nameEn).trim()) return String(json.nameEn).trim();
      const trSlug = getCategoryTrSlug(json);
      const mapped = trSlug ? CATEGORY_EN_BY_TR_SLUG[normalizeSlugKey(trSlug)] : null;
      if (mapped && mapped.name) return mapped.name;
    }
    return json.name || '';
  },
  findCategoryBySlugInList
};
