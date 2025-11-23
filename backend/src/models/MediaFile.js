const mongoose = require('mongoose');

const mediaFileSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'document', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hash: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

mediaFileSchema.index({ createdAt: -1 });
mediaFileSchema.index({ type: 1, createdAt: -1 });
mediaFileSchema.index({ tags: 1 });
mediaFileSchema.index({ originalName: 'text' });

module.exports = mongoose.model('MediaFile', mediaFileSchema);

