const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Kupon kodu zorunludur'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [32, 'Kupon kodu 32 karakterden uzun olamaz']
  },
  name: {
    type: String,
    required: [true, 'Kupon adı zorunludur'],
    trim: true,
    maxlength: [150, 'Kupon adı 150 karakterden uzun olamaz']
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama 500 karakteri geçemez']
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'],
    default: 'percentage'
  },
  value: {
    type: Number,
    default: 0,
    min: [0, 'İndirim değeri negatif olamaz']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum sipariş tutarı negatif olamaz']
  },
  maxDiscountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Maksimum indirim negatif olamaz']
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: [0, 'Kullanım limiti negatif olamaz']
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Kullanım sayısı negatif olamaz']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: () => new Date()
  },
  endDate: {
    type: Date
  },
  customerGroups: {
    type: String,
    enum: ['all', 'new_customers', 'returning_customers', 'vip'],
    default: 'all'
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  usagePerCustomer: {
    type: Number,
    default: 0,
    min: [0, 'Müşteri başına kullanım limiti negatif olamaz']
  },
  buyQuantity: {
    type: Number,
    default: 0
  },
  getQuantity: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

couponSchema.index({ code: 1 });
couponSchema.index({ type: 1, isActive: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

couponSchema.pre('save', function(next) {
  if (this.isModified('code') && this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Coupon', couponSchema);
