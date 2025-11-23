const mongoose = require('mongoose');

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

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Marka adı gerekli'],
      trim: true,
      unique: true,
      maxlength: [120, 'Marka adı 120 karakterden uzun olamaz']
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true
    },
    description: {
      type: String,
      maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
    },
    website: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      trim: true
    },
    banner: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      maxlength: [60, 'Ülke adı 60 karakterden uzun olamaz']
    },
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta başlık 60 karakterden uzun olamaz']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta açıklama 160 karakterden uzun olamaz']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    productCount: {
      type: Number,
      default: 0,
      min: [0, 'Ürün sayısı negatif olamaz']
    }
  },
  {
    timestamps: true
  }
);

brandSchema.index({ name: 1 });
brandSchema.index({ isActive: 1, sortOrder: 1 });

brandSchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = normalizeSlug(this.name);
  }
  next();
});

brandSchema.statics.normalizeSlug = normalizeSlug;

module.exports = mongoose.model('Brand', brandSchema);

