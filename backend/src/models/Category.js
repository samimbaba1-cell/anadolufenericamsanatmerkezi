const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { slugifyTr } = require('../utils/slugify');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Kategori adı gerekli' },
      len: { args: [1, 100], msg: 'Kategori adı 100 karakterden fazla olamaz' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Açıklama 500 karakterden fazla olamaz' }
    }
  },
  slug: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    field: 'parent_id'
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Seviye negatif olamaz' }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  },
  metaTitle: {
    type: DataTypes.STRING(60),
    allowNull: true,
    validate: {
      len: { args: [0, 60], msg: 'Meta başlık 60 karakterden fazla olamaz' }
    },
    field: 'meta_title'
  },
  metaDescription: {
    type: DataTypes.STRING(160),
    allowNull: true,
    validate: {
      len: { args: [0, 160], msg: 'Meta açıklama 160 karakterden fazla olamaz' }
    },
    field: 'meta_description'
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
  tableName: 'categories',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['slug'], unique: true },
    { fields: ['parent_id', 'isActive'] },
    { fields: ['level', 'sort_order'] }
  ],
  hooks: {
    beforeValidate: (category) => {
      // Generate slug from name if not provided
      if (category.name) {
        category.slug = slugifyTr(category.name);
      }
    }
  }
});

// Associations are defined in models/index.js to avoid duplicate aliases

module.exports = Category;
