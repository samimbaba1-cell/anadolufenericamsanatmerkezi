const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const normalizeSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Marka adı gerekli' },
      len: { args: [1, 120], msg: 'Marka adı 120 karakterden uzun olamaz' }
    }
  },
  slug: {
    type: DataTypes.STRING(120),
    unique: true,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Açıklama 500 karakterden uzun olamaz' }
    }
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  banner: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(60),
    allowNull: true,
    validate: {
      len: { args: [0, 60], msg: 'Ülke adı 60 karakterden uzun olamaz' }
    }
  },
  metaTitle: {
    type: DataTypes.STRING(60),
    allowNull: true,
    validate: {
      len: { args: [0, 60], msg: 'Meta başlık 60 karakterden uzun olamaz' }
    },
    field: 'meta_title'
  },
  metaDescription: {
    type: DataTypes.STRING(160),
    allowNull: true,
    validate: {
      len: { args: [0, 160], msg: 'Meta açıklama 160 karakterden uzun olamaz' }
    },
    field: 'meta_description'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  productCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Ürün sayısı negatif olamaz' }
    },
    field: 'product_count'
  }
}, {
  tableName: 'brands',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['slug'], unique: true },
    { fields: ['is_active', 'sort_order'] }
  ],
  hooks: {
    beforeValidate: (brand) => {
      if (brand.name && !brand.slug) {
        brand.slug = normalizeSlug(brand.name);
      }
    }
  }
});

Brand.normalizeSlug = normalizeSlug;

module.exports = Brand;
