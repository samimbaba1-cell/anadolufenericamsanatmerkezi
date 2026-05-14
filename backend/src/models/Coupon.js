const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Kupon kodu zorunludur' },
      len: { args: [1, 32], msg: 'Kupon kodu 32 karakterden uzun olamaz' }
    }
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Kupon adı zorunludur' },
      len: { args: [1, 150], msg: 'Kupon adı 150 karakterden uzun olamaz' }
    }
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Açıklama 500 karakteri geçemez' }
    }
  },
  type: {
    type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping', 'buy_x_get_y'),
    defaultValue: 'percentage'
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'İndirim değeri negatif olamaz' }
    }
  },
  minOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Minimum sipariş tutarı negatif olamaz' }
    },
    field: 'min_order_amount'
  },
  maxDiscountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Maksimum indirim negatif olamaz' }
    },
    field: 'max_discount_amount'
  },
  usageLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Kullanım limiti negatif olamaz' }
    },
    field: 'usage_limit'
  },
  usedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Kullanım sayısı negatif olamaz' }
    },
    field: 'used_count'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  // User restrictions as JSON array
  allowedUsers: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'allowed_users'
  },
  // Category restrictions as JSON array
  allowedCategories: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'allowed_categories'
  },
  // Product restrictions as JSON array
  allowedProducts: {
    type: DataTypes.JSON,
    defaultValue: [],
    field: 'allowed_products'
  }
}, {
  tableName: 'coupons',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['is_active', 'start_date', 'end_date'] }
  ],
  hooks: {
    beforeValidate: (coupon) => {
      if (coupon.code) {
        coupon.code = coupon.code.toUpperCase().trim();
      }
    }
  }
});

module.exports = Coupon;
