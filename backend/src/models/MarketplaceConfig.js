const mongoose = require('mongoose');

const marketplaceConfigSchema = new mongoose.Schema({
  feedToken: {
    type: String,
    trim: true
  },
  feedSettings: {
    vat: { type: Number },
    currency: { type: String },
    deliveryDays: { type: Number },
    imageLimit: { type: Number },
    brandKeys: [{ type: String }]
  },
  webhookSecrets: {
    trendyol: { type: String, trim: true },
    hepsiburada: { type: String, trim: true },
    n11: { type: String, trim: true }
  },
  integrations: {
    googleAnalyticsId: { type: String, trim: true },
    facebookPixelId: { type: String, trim: true },
    customScripts: [{ type: String }]
  },
  apiCredentials: {
    trendyol: {
      supplierId: { type: String, trim: true },
      username: { type: String, trim: true },
      password: { type: String, trim: true },
      enabled: { type: Boolean, default: false }
    },
    hepsiburada: {
      merchantId: { type: String, trim: true },
      username: { type: String, trim: true },
      password: { type: String, trim: true },
      enabled: { type: Boolean, default: false }
    },
    n11: {
      appKey: { type: String, trim: true },
      appSecret: { type: String, trim: true },
      enabled: { type: Boolean, default: false }
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

marketplaceConfigSchema.statics.getSingleton = async function() {
  const doc = await this.findOne().lean();
  return doc || null;
};

module.exports = mongoose.model('MarketplaceConfig', marketplaceConfigSchema);

