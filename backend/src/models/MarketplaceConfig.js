const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MarketplaceConfig = sequelize.define('MarketplaceConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  feedToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'feed_token'
  },
  // Feed settings as JSON
  feedSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      vat: 20,
      currency: 'TRY',
      deliveryDays: 3,
      imageLimit: 10,
      brandKeys: ['brand', 'marka']
    },
    field: 'feed_settings'
  },
  // Webhook secrets as JSON
  webhookSecrets: {
    type: DataTypes.JSON,
    defaultValue: {
      trendyol: '',
      hepsiburada: '',
      n11: ''
    },
    field: 'webhook_secrets'
  },
  // Integrations as JSON
  integrations: {
    type: DataTypes.JSON,
    defaultValue: {
      googleAnalyticsId: '',
      facebookPixelId: '',
      customScripts: []
    }
  },
  // API credentials as JSON
  apiCredentials: {
    type: DataTypes.JSON,
    defaultValue: {
      trendyol: {
        supplierId: '',
        username: '',
        password: '',
        enabled: false
      },
      hepsiburada: {
        merchantId: '',
        username: '',
        password: '',
        enabled: false
      },
      n11: {
        appKey: '',
        appSecret: '',
        enabled: false
      }
    },
    field: 'api_credentials'
  },
  updatedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'updated_by_id'
  }
}, {
  tableName: 'marketplace_configs',
  timestamps: true,
  underscored: false
});

// Static method for singleton pattern
MarketplaceConfig.getSingleton = async function() {
  let config = await MarketplaceConfig.findOne();
  if (!config) {
    config = await MarketplaceConfig.create({});
  }
  return config;
};

module.exports = MarketplaceConfig;
