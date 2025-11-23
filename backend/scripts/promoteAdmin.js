#!/usr/bin/env node

/**
 * Promote a user to admin role.
 * Usage: node scripts/promoteAdmin.js user@example.com
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../src/models/User');

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Kullanım: node scripts/promoteAdmin.js user@example.com');
    process.exit(1);
  }

  const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!uri) {
    console.error('DATABASE_URL .env dosyasında tanımlı değil.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const user = await User.findOneAndUpdate(
      { email },
      { role: 'admin', status: 'active', isActive: true },
      { new: true }
    );

    if (!user) {
      console.error(`Email adresi ile kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Kullanıcı admin yapıldı: ${user.name || user.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Admin yapma sırasında hata:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

run();

