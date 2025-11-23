const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  // Marketplace entegrasyonu için
  source: {
    type: String,
    enum: ['website', 'trendyol', 'hepsiburada', 'n11'],
    default: 'website'
  },
  externalId: {
    type: String, // Pazaryeri sipariş ID'si
    sparse: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Pazaryeri siparişlerinde kullanıcı olmayabilir
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Miktar en az 1 olmalı']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Fiyat negatif olamaz']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Toplam negatif olamaz']
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Ara toplam negatif olamaz']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Vergi negatif olamaz']
  },
  shipping: {
    type: Number,
    default: 0,
    min: [0, 'Kargo ücreti negatif olamaz']
  },
  shippingCompany: {
    type: String,
    default: 'Standart Kargo'
  },
  freeShippingApplied: {
    type: Boolean,
    default: false
  },
  shippingConfig: {
    enableFreeShipping: { type: Boolean, default: true },
    freeShippingThreshold: { type: Number, default: 500 },
    shippingCost: { type: Number, default: 25 },
    estimatedDeliveryDays: { type: Number, default: 3 }
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'İndirim negatif olamaz']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Toplam negatif olamaz']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'cash_on_delivery', 'iyzico', 'marketplace'],
    required: true
  },
  paymentId: {
    type: String
  },
  paymentSnapshot: {
    bankAccount: {
      bankName: String,
      accountName: String,
      iban: String,
      branch: String,
      accountNumber: String,
      description: String
    },
    gateway: String,
    settledAt: Date,
    manualNote: String,
    manualNoteUpdatedAt: Date,
    manualNoteUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  shippingSnapshot: {
    manualNote: String,
    manualNoteUpdatedAt: Date,
    manualNoteUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  shippingAddress: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    company: String,
    address1: {
      type: String,
      required: true,
      trim: true
    },
    address2: String,
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      default: 'Turkey'
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  billingAddress: {
    firstName: String,
    lastName: String,
    company: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notlar 500 karakterden fazla olamaz']
  },
  trackingNumber: {
    type: String
  },
  estimatedDelivery: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelledReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `CM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for full name
orderSchema.virtual('shippingAddress.fullName').get(function() {
  return `${this.shippingAddress.firstName} ${this.shippingAddress.lastName}`;
});

// Virtual for order status in Turkish
orderSchema.virtual('statusTurkish').get(function() {
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
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
