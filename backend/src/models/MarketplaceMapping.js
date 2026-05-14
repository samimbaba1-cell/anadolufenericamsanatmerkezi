const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MarketplaceMapping = sequelize.define('MarketplaceMapping', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // All mappings as JSON
  trendyol: {
    type: DataTypes.JSON,
    defaultValue: {
      brandMap: {},
      categoryMap: {}
    }
  },
  hepsiburada: {
    type: DataTypes.JSON,
    defaultValue: {
      brandMap: {},
      categoryMap: {}
    }
  },
  n11: {
    type: DataTypes.JSON,
    defaultValue: {
      brandMap: {},
      categoryMap: {}
    }
  }
}, {
  tableName: 'marketplace_mappings',
  timestamps: true,
  underscored: false
});

module.exports = MarketplaceMapping;
