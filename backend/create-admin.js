const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { sequelize, testConnection } = require('./src/config/database');
const User = require('./src/models/User');

function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production ortaminda ADMIN_PASSWORD olmadan admin kullanicisi olusturulamaz.');
  }

  return 'admin123';
}

async function createAdmin() {
  try {
    // MySQL bağlantısı
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ MySQL bağlantısı başarısız');
      process.exit(1);
    }

    // Load models
    require('./src/models');

    // Admin kullanıcısı var mı kontrol et
    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      console.log('❌ Admin kullanıcısı zaten mevcut:', existingAdmin.email);
      process.exit(0);
    }

    const adminPassword = getAdminPassword();

    // Admin kullanıcısı oluştur
    const adminUser = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@anadolufenericamsanatmerkezi.com',
      password: adminPassword,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!');
    console.log(`📧 Email: ${adminUser.email}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔑 Şifre: admin123');
    }
    console.log('🔗 Admin paneline giriş: http://localhost:3001/admin');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createAdmin();
