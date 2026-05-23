#!/usr/bin/env node

/**
 * Tüm kategori slug'larını isimden (Türkçe karakterli) yeniden yazar.
 * Token gerekmez — sunucuda doğrudan çalıştırın.
 *
 *   cd /var/www/afcsm/backend
 *   node scripts/fix-category-slugs.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { testConnection } = require('../src/config/database');
const Category = require('../src/models/Category');
const { slugifyTr } = require('../src/utils/slugify');

async function run() {
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ MySQL bağlantısı başarısız (.env kontrol edin)');
    process.exit(1);
  }

  const categories = await Category.findAll({ order: [['id', 'ASC']] });
  let updated = 0;

  for (const cat of categories) {
    const next = slugifyTr(cat.name);
    if (!next) {
      console.warn(`⚠️  Atlandı (isim yok): id=${cat.id}`);
      continue;
    }
    if (cat.slug !== next) {
      const prev = cat.slug || '(boş)';
      await cat.update({ slug: next });
      updated += 1;
      console.log(`✅ ${cat.name}: ${prev} → ${next}`);
    } else {
      console.log(`   ${cat.name}: ${next} (zaten doğru)`);
    }
  }

  console.log(`\nBitti. ${updated} / ${categories.length} kategori güncellendi.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Hata:', err.message);
  process.exit(1);
});
