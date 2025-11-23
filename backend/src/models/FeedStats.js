const mongoose = require('mongoose');

const feedStatsSchema = new mongoose.Schema({
  marketplace: {
    type: String,
    required: true,
    enum: ['trendyol', 'hepsiburada', 'n11'],
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  // Feed generation stats
  productsExported: {
    type: Number,
    default: 0,
    min: 0
  },
  variantsExported: {
    type: Number,
    default: 0,
    min: 0
  },
  generationTime: {
    type: Number, // milliseconds
    default: 0
  },
  // Image stats
  totalImages: {
    type: Number,
    default: 0
  },
  invalidImages: {
    type: Number,
    default: 0
  },
  // Error tracking
  errors: [{
    type: {
      type: String,
      enum: ['validation', 'image', 'mapping', 'other']
    },
    message: String,
    productId: mongoose.Schema.Types.ObjectId,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Request info
  requestCount: {
    type: Number,
    default: 1
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  accessedBy: {
    ip: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Composite index for efficient queries
feedStatsSchema.index({ marketplace: 1, date: -1 });
feedStatsSchema.index({ createdAt: -1 });

// Static method: Record feed generation
feedStatsSchema.statics.recordGeneration = async function(marketplace, stats) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await this.findOneAndUpdate(
      {
        marketplace,
        date: today
      },
      {
        $set: {
          productsExported: stats.productsExported || 0,
          variantsExported: stats.variantsExported || 0,
          generationTime: stats.generationTime || 0,
          totalImages: stats.totalImages || 0,
          invalidImages: stats.invalidImages || 0,
          lastAccessedAt: new Date(),
          accessedBy: stats.accessedBy || {}
        },
        $inc: { requestCount: 1 },
        $push: stats.errors ? { errors: { $each: stats.errors } } : {}
      },
      {
        upsert: true,
        new: true
      }
    );
  } catch (error) {
    console.error('Feed stats kayıt hatası:', error);
  }
};

// Static method: Get stats summary
feedStatsSchema.statics.getSummary = async function(marketplace, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.aggregate([
    {
      $match: {
        marketplace,
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: '$requestCount' },
        avgProductsExported: { $avg: '$productsExported' },
        avgGenerationTime: { $avg: '$generationTime' },
        totalErrors: { $sum: { $size: '$errors' } },
        totalInvalidImages: { $sum: '$invalidImages' }
      }
    }
  ]);
};

module.exports = mongoose.model('FeedStats', feedStatsSchema);

