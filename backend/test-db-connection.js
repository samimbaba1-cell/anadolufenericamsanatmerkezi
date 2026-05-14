const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔍 Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');

const { getDatabaseConfig } = require('./src/config/database');

// Test getDatabaseConfig
try {
  const config = getDatabaseConfig();
  console.log('\n📋 Database Config:');
  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('Username:', config.username);
  console.log('Password:', config.password ? '***' : 'NOT SET');
  console.log('Database:', config.database);
  
  if (!config.password) {
    console.error('\n❌ Şifre config\'de yok!');
    console.log('DATABASE_URL parse ediliyor...');
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      console.log('URL username:', url.username);
      console.log('URL password:', url.password ? '***' : 'NOT SET');
    }
  } else {
    console.log('\n✅ Config doğru görünüyor');
  }
} catch (error) {
  console.error('❌ Config hatası:', error.message);
}

