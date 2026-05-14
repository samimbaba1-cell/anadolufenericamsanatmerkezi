#!/usr/bin/env node

/**
 * Promote a user to admin role.
 * Usage: node scripts/promoteAdmin.js user@example.com
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize, testConnection } = require('../src/config/database');
const User = require('../src/models/User');

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Kullanım: node scripts/promoteAdmin.js user@example.com');
    process.exit(1);
  }

  try {
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ MySQL bağlantısı başarısız');
      process.exit(1);
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error(`❌ Email adresi ile kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }

    await user.update({
      role: 'admin',
      status: 'active',
      isActive: true
    });

    console.log(`✅ Kullanıcı admin yapıldı: ${user.name || user.email}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Admin yapma sırasında hata:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();

