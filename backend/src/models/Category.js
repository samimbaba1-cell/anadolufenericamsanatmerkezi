const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kategori adı gerekli'],
    trim: true,
    unique: true,
    maxlength: [100, 'Kategori adı 100 karakterden fazla olamaz']
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama 500 karakterden fazla olamaz']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  image: {
    type: String
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: [0, 'Seviye negatif olamaz']
  },
  path: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta başlık 60 karakterden fazla olamaz']
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta açıklama 160 karakterden fazla olamaz']
  },
  productCount: {
    type: Number,
    default: 0,
    min: [0, 'Ürün sayısı negatif olamaz']
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ level: 1, sortOrder: 1 });

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for children categories
categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for full path
categorySchema.virtual('fullPath').get(function() {
  if (!Array.isArray(this.path) || this.path.length === 0) {
    return this.name || '';
  }

  return this.path
    .map((p) => {
      if (!p) return '';
      if (typeof p === 'string') return p;
      if (p.name) return p.name;
      return p.toString();
    })
    .filter(Boolean)
    .concat(this.name || [])
    .join(' > ');
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
