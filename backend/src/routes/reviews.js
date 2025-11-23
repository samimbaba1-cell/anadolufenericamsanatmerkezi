const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reviews
// @desc    Get reviews for a product
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { productId, page = 1, limit = 10, rating } = req.query;
    
    if (!productId) {
      return res.status(400).json({
        error: 'Ürün ID gerekli'
      });
    }
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: 'Geçersiz ürün ID' });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);

    const filter = { 
      product: productObjectId, 
      isActive: true,
      status: 'approved'
    };
    
    if (rating) {
      const r = parseInt(rating, 10);
      if (!Number.isNaN(r)) {
        filter.rating = r;
      }
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit)
      .lean();

    const total = await Review.countDocuments(filter);

    // Get rating distribution
    const ratingStats = await Review.aggregate([
      { $match: { product: productObjectId, isActive: true, status: 'approved' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      reviews,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      },
      ratingStats
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/reviews
// @desc    Create review
// @access  Private
router.post('/', auth, [
  body('productId').isMongoId().withMessage('Geçerli ürün ID gerekli'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Puan 1-5 arası olmalı'),
  body('comment').trim().isLength({ min: 10, max: 1000 }).withMessage('Yorum 10-1000 karakter arası olmalı'),
  body('title').optional().trim().isLength({ max: 100 }).withMessage('Başlık 100 karakterden fazla olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { productId, rating, comment, title, images } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user.userId,
      product: productId
    });

    if (existingReview) {
      return res.status(400).json({
        error: 'Bu ürün için zaten yorum yaptınız'
      });
    }

    // Create review
    const review = new Review({
      user: req.user.userId,
      product: productId,
      rating,
      comment,
      title,
      images: images || [],
      status: 'pending'
    });

    await review.save();
    await review.populate('user', 'name email');

    res.status(201).json({
      message: 'Yorum başarıyla eklendi',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private
router.put('/:id', auth, [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Puan 1-5 arası olmalı'),
  body('comment').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Yorum 10-1000 karakter arası olmalı'),
  body('title').optional().trim().isLength({ max: 100 }).withMessage('Başlık 100 karakterden fazla olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!review) {
      return res.status(404).json({
        error: 'Yorum bulunamadı'
      });
    }

    const { rating, comment, title, images } = req.body;
    const updateData = {};

    if (rating) updateData.rating = rating;
    if (comment) updateData.comment = comment;
    if (title !== undefined) updateData.title = title;
    if (images) updateData.images = images;

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    res.json({
      message: 'Yorum başarıyla güncellendi',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!review) {
      return res.status(404).json({
        error: 'Yorum bulunamadı'
      });
    }

    res.json({
      message: 'Yorum başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      rating,
      productId,
      productIds,
      search,
      startDate,
      endDate
    } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (rating) {
      filter.rating = parseInt(rating, 10);
    }
    if (productId && mongoose.isValidObjectId(productId)) {
      filter.product = mongoose.Types.ObjectId(productId);
    } else if (productIds) {
      const ids = productIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => mongoose.isValidObjectId(id));
      if (ids.length > 0) {
        filter.product = { $in: ids.map((id) => mongoose.Types.ObjectId(id)) };
      }
    }
    if (search) {
      filter.comment = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    const numericLimit = Math.min(parseInt(limit, 10) || 20, 200);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const matchForStats = { ...filter };
    delete matchForStats.status;

    const [reviews, total, statusAggregation, ratingAggregation] = await Promise.all([
      Review.find(filter)
        .populate('product', 'name sku')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(numericLimit)
        .skip((numericPage - 1) * numericLimit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: matchForStats },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ])
    ]);

    const statusCounts = statusAggregation.reduce((acc, item) => {
      if (!item?._id) return acc;
      acc[item._id] = item.count;
      return acc;
    }, { pending: 0, approved: 0, rejected: 0 });

    res.json({
      items: reviews,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      },
      stats: {
        statusCounts,
        ratingDistribution: ratingAggregation.map((item) => ({
          rating: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Admin review list error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/status', auth, adminAuth, [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Geçersiz durum')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    review.status = req.body.status;
    await review.save();
    await review.populate('product', 'name');
    await Review.updateProductRating(review.product._id);

    res.json({ message: 'Yorum durumu güncellendi', review });
  } catch (error) {
    console.error('Admin review status error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }
    await Review.updateProductRating(review.product);
    res.json({ message: 'Yorum başarıyla silindi' });
  } catch (error) {
    console.error('Admin review delete error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/admin/bulk', auth, adminAuth, [
  body('reviewIds').isArray({ min: 1 }).withMessage('reviewIds dizisi gerekli'),
  body('action').isIn(['approve', 'reject', 'delete']).withMessage('Geçersiz aksiyon')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { reviewIds, action } = req.body;
    const objectIds = reviewIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => mongoose.Types.ObjectId(id));

    if (!objectIds.length) {
      return res.status(400).json({ error: 'Geçerli yorum ID bulunamadı' });
    }

    const reviews = await Review.find({ _id: { $in: objectIds } }).select('_id product status');
    if (!reviews.length) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    let modifiedCount = 0;
    if (action === 'delete') {
      const result = await Review.deleteMany({ _id: { $in: objectIds } });
      modifiedCount = result.deletedCount || 0;
    } else {
      const statusValue = action === 'approve' ? 'approved' : 'rejected';
      const result = await Review.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status: statusValue } }
      );
      modifiedCount = result.modifiedCount || 0;
    }

    const productIds = [...new Set(reviews.map((review) => String(review.product)))];
    await Promise.all(productIds.map((productId) => Review.updateProductRating(productId)));

    res.json({
      message: `Toplam ${modifiedCount} yorum için işlem tamamlandı`,
      affected: modifiedCount,
      action
    });
  } catch (error) {
    console.error('Admin bulk review action error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// @route   POST /api/reviews/:id/helpful
// @desc    Mark review as helpful
// @access  Private
router.post('/:id/helpful', auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        error: 'Yorum bulunamadı'
      });
    }

    res.json({
      message: 'Yorum yardımcı olarak işaretlendi',
      helpful: review.helpful
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
