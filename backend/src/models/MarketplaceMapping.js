const mongoose = require('mongoose');

const keyValueSchema = new mongoose.Schema({}, { strict: false, _id: false });

const marketplaceSchema = new mongoose.Schema({
  trendyol: {
    brandMap: { type: keyValueSchema, default: {} },
    categoryMap: { type: keyValueSchema, default: {} }
  },
  hepsiburada: {
    brandMap: { type: keyValueSchema, default: {} },
    categoryMap: { type: keyValueSchema, default: {} }
  },
  n11: {
    brandMap: { type: keyValueSchema, default: {} },
    categoryMap: { type: keyValueSchema, default: {} }
  }
}, { timestamps: true });

module.exports = mongoose.model('MarketplaceMapping', marketplaceSchema);


