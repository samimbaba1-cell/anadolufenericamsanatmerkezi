const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner başlığı gerekli'],
    trim: true,
    maxlength: [120, 'Başlık 120 karakterden uzun olamaz']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [160, 'Alt başlık 160 karakterden uzun olamaz']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  image: {
    type: String,
    trim: true
  },
  mobileImage: {
    type: String,
    trim: true
  },
  link: {
    type: String,
    trim: true
  },
  buttonText: {
    type: String,
    trim: true,
    default: 'Detay'
  },
  type: {
    type: String,
    trim: true,
    default: 'hero'
  },
  position: {
    type: String,
    trim: true,
    default: 'top'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 1
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  targetAudience: {
    type: String,
    trim: true,
    default: 'all'
  },
  backgroundColor: {
    type: String,
    trim: true,
    default: '#3B82F6'
  },
  textColor: {
    type: String,
    trim: true,
    default: '#FFFFFF'
  }
}, {
  timestamps: true
});

bannerSchema.index({ position: 1, order: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Banner', bannerSchema);

