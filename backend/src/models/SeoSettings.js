const mongoose = require('mongoose');

const seoSettingsSchema = new mongoose.Schema({
  siteTitle: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi - Kaliteli Ürünler, Güvenilir Hizmet' },
  siteDescription: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi ile el yapımı cam sanat eserleri ve dekoratif ürünleri keşfedin. Hızlı teslimat, güvenli ödeme ve müşteri memnuniyeti garantisi.' },
  keywords: { type: String, default: 'e-ticaret, online alışveriş, kaliteli ürünler, güvenli ödeme, hızlı teslimat' },
  ogTitle: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş' },
  ogDescription: { type: String, default: 'Kaliteli ürünleri uygun fiyatlarla keşfedin. Hızlı teslimat ve güvenli ödeme garantisi.' },
  ogImage: { type: String, default: '' },
  twitterCard: { type: String, default: 'summary_large_image' },
  twitterSite: { type: String, default: '@anadolufenericam' },
  twitterCreator: { type: String, default: '@anadolufenericam' },
  robots: { type: String, default: 'index, follow' },
  canonicalUrl: { type: String, default: '' },
  sitemapUrl: { type: String, default: '/sitemap.xml' },
  googleAnalytics: { type: String, default: '' },
  googleSearchConsole: { type: String, default: '' },
  facebookPixel: { type: String, default: '' },
  customHead: { type: String, default: '' },
  customFooter: { type: String, default: '' },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

seoSettingsSchema.statics.getSingleton = async function() {
  const doc = await this.findOne().lean();
  return doc || null;
};

module.exports = mongoose.model('SeoSettings', seoSettingsSchema);

