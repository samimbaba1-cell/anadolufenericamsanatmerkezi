const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MarketplacePushLog = sequelize.define('MarketplacePushLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  marketplace: {
    type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('success', 'error'),
    allowNull: false
  },
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'request_count'
  },
  productCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'product_count'
  },
  // Product IDs as JSON array
  productIds: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'product_ids'
  },
  triggeredById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'triggered_by_id'
  },
  durationMs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'duration_ms'
  },
  // Response as JSON
  response: {
    type: DataTypes.JSON,
    allowNull: true
  },
  responseSnippet: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'response_snippet'
  },
  errorMessage: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    field: 'error_message'
  },
  errorStack: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_stack'
  },
  // Meta as JSON
  meta: {
    type: DataTypes.JSON,
    allowNull: true
  },
  triggeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'triggered_at'
  }
}, {
  tableName: 'marketplace_push_logs',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['marketplace', 'createdAt'] },
    { fields: ['status', 'createdAt'] },
    { fields: ['triggered_by_id', 'createdAt'] }
  ]
});

module.exports = MarketplacePushLog;
