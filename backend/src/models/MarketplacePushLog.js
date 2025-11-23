const mongoose = require('mongoose');

const marketplacePushLogSchema = new mongoose.Schema(
  {
    marketplace: {
      type: String,
      enum: ['trendyol', 'hepsiburada', 'n11'],
      required: true
    },
    status: {
      type: String,
      enum: ['success', 'error'],
      required: true
    },
    requestCount: {
      type: Number,
      default: 0
    },
    productCount: {
      type: Number,
      default: 0
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    durationMs: {
      type: Number,
      default: 0
    },
    response: mongoose.Schema.Types.Mixed,
    responseSnippet: {
      type: String,
      maxlength: 1000
    },
    errorMessage: {
      type: String,
      maxlength: 1000
    },
    errorStack: {
      type: String
    },
    meta: mongoose.Schema.Types.Mixed,
    triggeredAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    timestamps: true
  }
);

marketplacePushLogSchema.index({ marketplace: 1, createdAt: -1 });
marketplacePushLogSchema.index({ status: 1, createdAt: -1 });
marketplacePushLogSchema.index({ triggeredBy: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplacePushLog', marketplacePushLogSchema);

