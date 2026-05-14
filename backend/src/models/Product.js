const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Ürün adı gerekli' },
      len: { args: [1, 200], msg: 'Ürün adı 200 karakterden fazla olamaz' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
    validate: {
      len: { args: [0, 2000], msg: 'Açıklama 2000 karakterden fazla olamaz' }
    }
  },
  shortDescription: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Kısa açıklama 500 karakterden fazla olamaz' }
    },
    field: 'short_description'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Fiyat negatif olamaz' }
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Orijinal fiyat negatif olamaz' }
    },
    field: 'original_price'
  },
  // Images as JSON array (MySQL 5.7+)
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    },
    field: 'category_id'
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  brandRefId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'brands',
      key: 'id'
    },
    field: 'brand_ref_id'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Stok negatif olamaz' }
    }
  },
  minStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Minimum stok negatif olamaz' }
    },
    field: 'min_stock'
  },
  stockUpdatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'stock_updated_at'
  },
  // Stock history as JSON array
  stockHistory: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'stock_history'
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  barcode: {
    type: DataTypes.STRING(13),
    allowNull: true,
    unique: true,
    validate: {
      is: { args: [/^\d{13}$/], msg: 'Barkod 13 haneli olmalıdır' }
    }
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date'
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'Ağırlık negatif olamaz' }
    }
  },
  // Dimensions as JSON object
  dimensions: {
    type: DataTypes.JSON,
    allowNull: true
  },
  // Rating as JSON object
  rating: {
    type: DataTypes.JSON,
    defaultValue: { average: 0, count: 0 }
  },
  // Tags as JSON array
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_featured'
  },
  // Attributes as JSON array
  attributes: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  // Variants as JSON array
  variants: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  // Marketplace pricing as JSON object
  marketplacePricing: {
    type: DataTypes.JSON,
    defaultValue: {},
    field: 'marketplace_pricing'
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['category_id', 'is_active'] },
    { fields: ['brand_ref_id', 'is_active'] },
    { fields: ['price'] },
    { fields: ['createdAt'] },
    { fields: ['sku'], unique: true, where: { sku: { [sequelize.Sequelize.Op.ne]: null } } },
    { fields: ['barcode'], unique: true, where: { barcode: { [sequelize.Sequelize.Op.ne]: null } } }
  ]
});

// Virtual fields (computed in application layer)
Product.prototype.getDiscountPercentage = function() {
  if (this.originalPrice && parseFloat(this.originalPrice) > parseFloat(this.price)) {
    return Math.round(((parseFloat(this.originalPrice) - parseFloat(this.price)) / parseFloat(this.originalPrice)) * 100);
  }
  return 0;
};

Product.prototype.getIsInStock = function() {
  return this.stock > 0;
};

Product.prototype.toJSON = function() {
  const product = { ...this.get() };
  product.discountPercentage = this.getDiscountPercentage();
  product.isInStock = this.getIsInStock();
  return product;
};

module.exports = Product;
