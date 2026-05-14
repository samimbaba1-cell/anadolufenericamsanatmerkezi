const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// MySQL connection string parse
const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  
  if (databaseUrl && databaseUrl.startsWith('mysql://')) {
    // Parse MySQL URL: mysql://user:password@host:port/database
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || 3306,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading '/'
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: false
      }
    };
  }
  
  // Fallback to individual env variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'anadolufenericamsanatmerkezi',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false
    }
  };
};

const config = getDatabaseConfig();
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging,
  pool: config.pool,
  define: config.define
});

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL bağlantısı başarılı');
    return true;
  } catch (error) {
    console.error('❌ MySQL bağlantı hatası:', error.message);
    return false;
  }
}

// Sync database (use with caution in production)
async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log('✅ Veritabanı senkronizasyonu tamamlandı');
    return true;
  } catch (error) {
    console.error('❌ Veritabanı senkronizasyon hatası:', error.message);
    return false;
  }
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  syncDatabase,
  getDatabaseConfig
};

