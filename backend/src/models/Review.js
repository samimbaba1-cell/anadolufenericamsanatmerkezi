const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    field: 'product_id'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1], msg: 'Puan en az 1 olmalı' },
      max: { args: [5], msg: 'Puan en fazla 5 olmalı' }
    }
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      len: { args: [0, 100], msg: 'Başlık 100 karakterden fazla olamaz' }
    }
  },
  comment: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Yorum gerekli' },
      len: { args: [1, 1000], msg: 'Yorum 1000 karakterden fazla olamaz' }
    }
  },
  // Images as JSON array
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  },
  helpful: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Yardımcı sayısı negatif olamaz' }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['product_id', 'createdAt'] },
    { fields: ['user_id', 'product_id'], unique: true },
    { fields: ['rating'] },
    { fields: ['status', 'is_active'] }
  ]
});

module.exports = Review;
