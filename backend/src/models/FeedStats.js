const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeedStats = sequelize.define('FeedStats', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  marketplace: {
    type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11'),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  productsExported: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Ürün sayısı negatif olamaz' }
    },
    field: 'products_exported'
  },
  variantsExported: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Varyant sayısı negatif olamaz' }
    },
    field: 'variants_exported'
  },
  generationTime: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'generation_time'
  },
  totalImages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_images'
  },
  invalidImages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'invalid_images'
  },
  // Errors as JSON array
  errors: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  requestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'request_count'
  },
  lastAccessedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_accessed_at'
  },
  // Accessed by as JSON
  accessedBy: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'accessed_by'
  }
}, {
  tableName: 'feed_stats',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['marketplace', 'date'], unique: true },
    { fields: ['createdAt'] }
  ]
});

// Static method: Record feed generation
FeedStats.recordGeneration = async function(marketplace, stats) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [feedStat, created] = await FeedStats.findOrCreate({
      where: {
        marketplace,
        date: today
      },
      defaults: {
        productsExported: stats.productsExported || 0,
        variantsExported: stats.variantsExported || 0,
        generationTime: stats.generationTime || 0,
        totalImages: stats.totalImages || 0,
        invalidImages: stats.invalidImages || 0,
        lastAccessedAt: new Date(),
        accessedBy: stats.accessedBy || {},
        requestCount: 1,
        errors: stats.errors || []
      }
    });
    
    if (!created) {
      await feedStat.update({
        productsExported: stats.productsExported || feedStat.productsExported,
        variantsExported: stats.variantsExported || feedStat.variantsExported,
        generationTime: stats.generationTime || feedStat.generationTime,
        totalImages: stats.totalImages || feedStat.totalImages,
        invalidImages: stats.invalidImages || feedStat.invalidImages,
        lastAccessedAt: new Date(),
        accessedBy: stats.accessedBy || feedStat.accessedBy,
        requestCount: feedStat.requestCount + 1,
        errors: stats.errors ? [...(feedStat.errors || []), ...stats.errors] : feedStat.errors
      });
    }
    
    return feedStat;
  } catch (error) {
    console.error('Feed stats kayıt hatası:', error);
    throw error;
  }
};

// Static method: Get stats summary
FeedStats.getSummary = async function(marketplace, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await FeedStats.findAll({
    where: {
      marketplace,
      date: {
        [sequelize.Sequelize.Op.gte]: startDate
      }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('request_count')), 'totalRequests'],
      [sequelize.fn('AVG', sequelize.col('products_exported')), 'avgProductsExported'],
      [sequelize.fn('AVG', sequelize.col('generation_time')), 'avgGenerationTime'],
      [sequelize.fn('SUM', sequelize.col('invalid_images')), 'totalInvalidImages']
    ],
    raw: true
  });
  
  return stats[0] || {
    totalRequests: 0,
    avgProductsExported: 0,
    avgGenerationTime: 0,
    totalInvalidImages: 0
  };
};

module.exports = FeedStats;
