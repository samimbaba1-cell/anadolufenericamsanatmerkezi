const { slugifyTr, normalizeSlugKey, slugsMatch, safeDecodeURIComponent } = require('./slugify');

const CATEGORY_TRANSLATIONS = [
  { trSlug: 'kolyeler', nameEn: 'Necklaces', slugEn: 'necklaces' },
  { trSlug: 'bileklikler', nameEn: 'Bracelets', slugEn: 'bracelets' },
  { trSlug: 'yüzükler', nameEn: 'Rings', slugEn: 'rings' },
  { trSlug: 'su-bardakları', nameEn: 'Water Glasses', slugEn: 'water-glasses' },
  { trSlug: '3-lü-set-figürler', nameEn: '3-Piece Figure Sets', slugEn: '3-piece-figure-sets' },
  { trSlug: 'sevgililer-günü', nameEn: "Valentine's Day", slugEn: 'valentines-day' },
  { trSlug: 'limonata-bardakları', nameEn: 'Lemonade Glasses', slugEn: 'lemonade-glasses' },
  { trSlug: 'rakı-bardakları', nameEn: 'Raki Glasses', slugEn: 'raki-glasses' },
  { trSlug: 'cam-pipetleri', nameEn: 'Glass Straws', slugEn: 'glass-straws' },
  { trSlug: 'küpeler', nameEn: 'Earrings', slugEn: 'earrings' },
  { trSlug: 'cam-figürler', nameEn: 'Glass Figures', slugEn: 'glass-figures' },
  { trSlug: 'cam-ağaçlar', nameEn: 'Glass Trees', slugEn: 'glass-trees' }
];

const LOOKUP_BY_KEY = {};

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

for (const entry of CATEGORY_TRANSLATIONS) {
  const keys = new Set([
    normalizeSlugKey(entry.trSlug),
    slugifyEn(entry.trSlug),
    slugifyEn(entry.nameEn)
  ]);
  for (const key of keys) {
    if (key) LOOKUP_BY_KEY[key] = entry;
  }
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

function lookupTranslation(categoryOrSlugKey) {
  if (!categoryOrSlugKey) return null;

  if (typeof categoryOrSlugKey === 'object') {
    const trSlug = getCategoryTrSlug(categoryOrSlugKey);
    const keys = [
      trSlug && normalizeSlugKey(trSlug),
      trSlug && slugifyEn(trSlug),
      categoryOrSlugKey.name && slugifyEn(categoryOrSlugKey.name)
    ].filter(Boolean);
    for (const key of keys) {
      if (LOOKUP_BY_KEY[key]) return LOOKUP_BY_KEY[key];
    }
    return null;
  }

  const keys = [normalizeSlugKey(categoryOrSlugKey), slugifyEn(categoryOrSlugKey)];
  for (const key of keys) {
    if (LOOKUP_BY_KEY[key]) return LOOKUP_BY_KEY[key];
  }
  return null;
}

function getCategoryEnSlug(json) {
  if (!json) return null;
  if (json.slugEn && String(json.slugEn).trim()) return slugifyEn(json.slugEn);
  if (json.nameEn && String(json.nameEn).trim()) return slugifyEn(json.nameEn);
  const mapped = lookupTranslation(json);
  if (mapped && mapped.slugEn) return mapped.slugEn;
  if (json.name) return slugifyEn(json.name);
  const trSlug = getCategoryTrSlug(json);
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
  const targetAscii = slugifyEn(decoded);

  const mapped = lookupTranslation(decoded);
  if (mapped) {
    const byMap = categoryRows.find((row) => {
      const json = row.toJSON ? row.toJSON() : row;
      const trSlug = getCategoryTrSlug(json);
      return trSlug && normalizeSlugKey(trSlug) === normalizeSlugKey(mapped.trSlug);
    });
    if (byMap) return byMap;
  }

  const byEnSlug = categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    const enSlug = getCategoryEnSlug(json);
    if (!enSlug) return false;
    return normalizeSlugKey(enSlug) === target || slugifyEn(enSlug) === targetAscii;
  });
  if (byEnSlug) return byEnSlug;

  return categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    if (json.name && normalizeSlugKey(json.name) === target) return true;
    if (json.slug && slugsMatch(decoded, json.slug)) return true;
    if (json.name && slugsMatch(decoded, json.name)) return true;
    return false;
  });
}

module.exports = {
  CATEGORY_TRANSLATIONS,
  getCategoryTrSlug,
  getCategoryEnSlug,
  getCategoryDisplayName(json, locale = 'tr') {
    if (!json) return '';
    if (locale === 'en') {
      if (json.nameEn && String(json.nameEn).trim()) return String(json.nameEn).trim();
      const mapped = lookupTranslation(json);
      if (mapped && mapped.nameEn) return mapped.nameEn;
    }
    return json.name || '';
  },
  findCategoryBySlugInList
};
