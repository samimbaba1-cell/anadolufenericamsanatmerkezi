const { slugifyTr, normalizeSlugKey, slugsMatch, safeDecodeURIComponent } = require('./slugify');

function transliterateTrToAscii(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U');
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

const CATEGORY_TRANSLATIONS = [
  { trSlug: 'kolyeler', nameEn: 'Necklaces', slugEn: 'necklaces' },
  { trSlug: 'bileklikler', nameEn: 'Bracelets', slugEn: 'bracelets' },
  { trSlug: 'yüzükler', nameEn: 'Rings', slugEn: 'rings' },
  { trSlug: 'su-bardakları', nameEn: 'Water Glasses', slugEn: 'water-glasses' },
  {
    trSlug: '3lü-set-figürler',
    nameEn: '3-Piece Figure Sets',
    slugEn: '3-piece-figure-sets',
    aliases: ['3lu-set-figürler', '3lu-set-figurler', '3-lü-set-figürler']
  },
  { trSlug: 'sevgililer-günü', nameEn: "Valentine's Day", slugEn: 'valentines-day' },
  { trSlug: 'limonata-bardakları', nameEn: 'Lemonade Glasses', slugEn: 'lemonade-glasses' },
  { trSlug: 'rakı-bardakları', nameEn: 'Raki Glasses', slugEn: 'raki-glasses' },
  { trSlug: 'cam-pipetleri', nameEn: 'Glass Straws', slugEn: 'glass-straws' },
  { trSlug: 'küpeler', nameEn: 'Earrings', slugEn: 'earrings' },
  { trSlug: 'cam-figürler', nameEn: 'Glass Figures', slugEn: 'glass-figures' },
  { trSlug: 'cam-ağaçlar', nameEn: 'Glass Trees', slugEn: 'glass-trees' }
];

const LOOKUP_BY_KEY = {};

function registerTranslationKeys(entry) {
  const keys = new Set([
    entry.trSlug,
    ...(entry.aliases || []),
    normalizeSlugKey(entry.trSlug),
    slugifyEn(entry.trSlug),
    slugifyEn(entry.nameEn),
    entry.slugEn
  ]);
  for (const alias of entry.aliases || []) {
    keys.add(normalizeSlugKey(alias));
    keys.add(slugifyEn(alias));
  }
  for (const key of keys) {
    if (key) LOOKUP_BY_KEY[key] = entry;
  }
}

for (const entry of CATEGORY_TRANSLATIONS) {
  registerTranslationKeys(entry);
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

function matchTranslation(candidate) {
  if (!candidate) return null;
  const keys = [candidate, normalizeSlugKey(candidate), slugifyEn(candidate)];
  for (const key of keys) {
    if (key && LOOKUP_BY_KEY[key]) return LOOKUP_BY_KEY[key];
  }
  for (const entry of CATEGORY_TRANSLATIONS) {
    const variants = [entry.trSlug, ...(entry.aliases || []), entry.slugEn];
    if (variants.some((v) => slugsMatch(candidate, v))) return entry;
  }
  return null;
}

function lookupTranslation(categoryOrSlugKey) {
  if (!categoryOrSlugKey) return null;

  if (typeof categoryOrSlugKey === 'object') {
    const trSlug = getCategoryTrSlug(categoryOrSlugKey);
    const candidates = [
      trSlug,
      categoryOrSlugKey.slug,
      categoryOrSlugKey.name && slugifyEn(categoryOrSlugKey.name)
    ].filter(Boolean);
    for (const candidate of candidates) {
      const hit = matchTranslation(candidate);
      if (hit) return hit;
    }
    return null;
  }

  return matchTranslation(categoryOrSlugKey);
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

function categoryMatchesTranslation(category, entry) {
  const trSlug = getCategoryTrSlug(category);
  const dbSlug = category.slug;
  const variants = [entry.trSlug, ...(entry.aliases || [])];
  return variants.some(
    (v) =>
      (trSlug && slugsMatch(trSlug, v)) ||
      (dbSlug && slugsMatch(dbSlug, v)) ||
      (category.name && slugsMatch(category.name, v))
  );
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

  const mapped = lookupTranslation(decoded);
  if (mapped) {
    const byMap = categoryRows.find((row) => {
      const json = row.toJSON ? row.toJSON() : row;
      return categoryMatchesTranslation(json, mapped);
    });
    if (byMap) return byMap;
  }

  const byEnSlug = categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    const enSlug = getCategoryEnSlug(json);
    return enSlug && slugsMatch(enSlug, decoded);
  });
  if (byEnSlug) return byEnSlug;

  return categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    if (json.name && slugsMatch(decoded, json.name)) return true;
    if (json.slug && slugsMatch(decoded, json.slug)) return true;
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
