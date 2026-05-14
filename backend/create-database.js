const { Sequelize } = require('sequelize');
require('dotenv').config();

async function createDatabase() {
  // Önce veritabanı olmadan bağlan
  const sequelize = new Sequelize('', process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ MySQL bağlantısı başarılı');

    // Veritabanını oluştur
    const dbName = process.env.DB_NAME || 'anadolufenericamsanatmerkezi';
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Veritabanı oluşturuldu: ${dbName}`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createDatabase();

