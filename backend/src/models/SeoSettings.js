const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SeoSettings = sequelize.define('SeoSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  siteTitle: {
    type: DataTypes.STRING(200),
    defaultValue: 'Anadolu Feneri Cam Sanat Merkezi - Kaliteli Ürünler, Güvenilir Hizmet',
    field: 'site_title'
  },
  siteDescription: {
    type: DataTypes.TEXT,
    defaultValue: 'Anadolu Feneri Cam Sanat Merkezi ile el yapımı cam sanat eserleri ve dekoratif ürünleri keşfedin. Hızlı teslimat, güvenli ödeme ve müşteri memnuniyeti garantisi.',
    field: 'site_description'
  },
  keywords: {
    type: DataTypes.STRING(500),
    defaultValue: 'e-ticaret, online alışveriş, kaliteli ürünler, güvenli ödeme, hızlı teslimat'
  },
  ogTitle: {
    type: DataTypes.STRING(200),
    defaultValue: 'Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş',
    field: 'og_title'
  },
  ogDescription: {
    type: DataTypes.STRING(300),
    defaultValue: 'Kaliteli ürünleri uygun fiyatlarla keşfedin. Hızlı teslimat ve güvenli ödeme garantisi.',
    field: 'og_description'
  },
  ogImage: {
    type: DataTypes.STRING(500),
    defaultValue: '',
    field: 'og_image'
  },
  twitterCard: {
    type: DataTypes.STRING(50),
    defaultValue: 'summary_large_image',
    field: 'twitter_card'
  },
  twitterSite: {
    type: DataTypes.STRING(100),
    defaultValue: '@anadolufenericam',
    field: 'twitter_site'
  },
  twitterCreator: {
    type: DataTypes.STRING(100),
    defaultValue: '@anadolufenericam',
    field: 'twitter_creator'
  },
  robots: {
    type: DataTypes.STRING(100),
    defaultValue: 'index, follow'
  },
  canonicalUrl: {
    type: DataTypes.STRING(500),
    defaultValue: '',
    field: 'canonical_url'
  },
  sitemapUrl: {
    type: DataTypes.STRING(200),
    defaultValue: '/sitemap.xml',
    field: 'sitemap_url'
  },
  googleAnalytics: {
    type: DataTypes.STRING(100),
    defaultValue: '',
    field: 'google_analytics'
  },
  googleSearchConsole: {
    type: DataTypes.STRING(200),
    defaultValue: '',
    field: 'google_search_console'
  },
  facebookPixel: {
    type: DataTypes.STRING(100),
    defaultValue: '',
    field: 'facebook_pixel'
  },
  customHead: {
    type: DataTypes.TEXT,
    defaultValue: '',
    field: 'custom_head'
  },
  customFooter: {
    type: DataTypes.TEXT,
    defaultValue: '',
    field: 'custom_footer'
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
  tableName: 'seo_settings',
  timestamps: true,
  underscored: false
});

// Static method for singleton pattern
SeoSettings.getSingleton = async function() {
  let settings = await SeoSettings.findOne();
  if (!settings) {
    settings = await SeoSettings.create({});
  }
  return settings;
};

module.exports = SeoSettings;
