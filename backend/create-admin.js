const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config({ path: './.env' });

async function createAdmin() {
  try {
    // MongoDB bağlantısı
    const mongoUrl = process.env.DATABASE_URL || 'mongodb+srv://samimbaba1_db_user:Samim123.@cluster0.yg0h4rg.mongodb.net/cmtc?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUrl);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Admin kullanıcısı var mı kontrol et
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('❌ Admin kullanıcısı zaten mevcut:', existingAdmin.email);
      process.exit(0);
    }

    // Admin kullanıcısı oluştur
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@anadolufenericamsanatmerkezi.com',
      password: 'admin123', // Bu şifre otomatik hash'lenecek
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    await adminUser.save();
    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu!');
    console.log('📧 Email: admin@anadolufenericamsanatmerkezi.com');
    console.log('🔑 Şifre: admin123');
    console.log('🔗 Admin paneline giriş: http://localhost:3001/admin');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
