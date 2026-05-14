const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  source: {
    type: DataTypes.ENUM('website', 'trendyol', 'hepsiburada', 'n11'),
    defaultValue: 'website'
  },
  externalId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'external_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  // Items as JSON array
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Ara toplam negatif olamaz' }
    }
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Vergi negatif olamaz' }
    }
  },
  shipping: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Kargo ücreti negatif olamaz' }
    }
  },
  shippingCompany: {
    type: DataTypes.STRING(100),
    defaultValue: 'Standart Kargo',
    field: 'shipping_company'
  },
  freeShippingApplied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'free_shipping_applied'
  },
  // Shipping config as JSON object
  shippingConfig: {
    type: DataTypes.JSON,
    defaultValue: {
      enableFreeShipping: true,
      freeShippingThreshold: 500,
      shippingCost: 25,
      estimatedDeliveryDays: 3
    },
    field: 'shipping_config'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'İndirim negatif olamaz' }
    }
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Toplam negatif olamaz' }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
    defaultValue: 'pending'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    field: 'payment_status'
  },
  paymentMethod: {
    type: DataTypes.ENUM('credit_card', 'bank_transfer', 'cash_on_delivery', 'iyzico', 'marketplace'),
    allowNull: false,
    field: 'payment_method'
  },
  paymentId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_id'
  },
  // Payment snapshot as JSON object
  paymentSnapshot: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'payment_snapshot'
  },
  // Shipping snapshot as JSON object
  shippingSnapshot: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'shipping_snapshot'
  },
  // Shipping address as JSON object
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'shipping_address'
  },
  // Billing address as JSON object
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'billing_address'
  },
  notes: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      len: { args: [0, 500], msg: 'Notlar 500 karakterden fazla olamaz' }
    }
  },
  trackingNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tracking_number'
  },
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'estimated_delivery'
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'delivered_at'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cancelled_at'
  },
  cancelledReason: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'cancelled_reason'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['order_number'], unique: true },
    { fields: ['user_id', 'createdAt'] },
    { fields: ['status'] },
    { fields: ['payment_status'] },
    { fields: ['createdAt'] }
  ],
  hooks: {
    beforeCreate: async (order) => {
      if (!order.orderNumber) {
        const count = await Order.count();
        order.orderNumber = `CM${String(count + 1).padStart(6, '0')}`;
      }
    }
  }
});

// Instance methods
Order.prototype.getStatusTurkish = function() {
  const statusMap = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargoya Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi'
  };
  return statusMap[this.status] || this.status;
};

Order.prototype.toJSON = function() {
  const order = { ...this.get() };
  order.statusTurkish = this.getStatusTurkish();
  
  // Reconstruct shippingAddress.fullName for backward compatibility
  if (order.shippingAddress && order.shippingAddress.firstName && order.shippingAddress.lastName) {
    order.shippingAddress.fullName = `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
  }
  
  return order;
};

module.exports = Order;
