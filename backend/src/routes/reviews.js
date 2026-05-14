const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');
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

    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);

    const where = { 
      productId: parseInt(productId),
      isActive: true,
      status: 'approved'
    };
    
    if (rating) {
      const r = parseInt(rating, 10);
      if (!Number.isNaN(r)) {
        where.rating = r;
      }
    }

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: numericLimit,
      offset: (numericPage - 1) * numericLimit
    });

    // Get rating distribution
    const allReviews = await Review.findAll({
      where: { productId: parseInt(productId), isActive: true, status: 'approved' },
      attributes: ['rating']
    });

    const ratingStats = {};
    allReviews.forEach(r => {
      ratingStats[r.rating] = (ratingStats[r.rating] || 0) + 1;
    });

    res.json({
      reviews: reviews.map(r => r.toJSON()),
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      },
      ratingStats: Object.entries(ratingStats).map(([rating, count]) => ({
        _id: parseInt(rating),
        count
      })).sort((a, b) => b._id - a._id)
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
  body('productId').isInt().withMessage('Geçerli ürün ID gerekli'),
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
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      where: {
        userId: req.user.userId,
        productId: productId
      }
    });

    if (existingReview) {
      return res.status(400).json({
        error: 'Bu ürün için zaten yorum yaptınız'
      });
    }

    // Create review
    const review = await Review.create({
      userId: req.user.userId,
      productId: productId,
      rating,
      comment,
      title,
      images: images || [],
      status: 'pending'
    });

    const reviewJson = review.toJSON();
    const user = await User.findByPk(req.user.userId, { attributes: ['id', 'name', 'email'] });
    reviewJson.user = user ? user.toJSON() : null;

    res.status(201).json({
      message: 'Yorum başarıyla eklendi',
      review: reviewJson
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
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!review) {
      return res.status(404).json({
        error: 'Yorum bulunamadı'
      });
    }

    const { rating, comment, title, images } = req.body;
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    if (title !== undefined) review.title = title;
    if (images) review.images = images;

    await review.save();
    const reviewJson = review.toJSON();
    const user = await User.findByPk(req.user.userId, { attributes: ['id', 'name', 'email'] });
    reviewJson.user = user ? user.toJSON() : null;

    res.json({
      message: 'Yorum başarıyla güncellendi',
      review: reviewJson
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
    const review = await Review.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!review) {
      return res.status(404).json({
        error: 'Yorum bulunamadı'
      });
    }

    await review.destroy();

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
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (rating) {
      where.rating = parseInt(rating, 10);
    }
    if (productId) {
      where.productId = parseInt(productId);
    } else if (productIds) {
      const ids = productIds
        .split(',')
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
      if (ids.length > 0) {
        where.productId = { [Op.in]: ids };
      }
    }
    if (search) {
      where.comment = { [Op.like]: `%${search}%` };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!Number.isNaN(start.getTime())) {
          where.createdAt[Op.gte] = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = end;
        }
      }
      if (Object.keys(where.createdAt).length === 0) {
        delete where.createdAt;
      }
    }

    const numericLimit = Math.min(parseInt(limit, 10) || 20, 200);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'], required: false },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      limit: numericLimit,
      offset: (numericPage - 1) * numericLimit
    });

    // Status and rating stats - remove status from where clause to get all reviews
    const whereWithoutStatus = { ...where };
    delete whereWithoutStatus.status;
    const allReviews = await Review.findAll({ where: whereWithoutStatus });
    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    const ratingDistribution = {};

    allReviews.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    res.json({
      items: reviews.map(r => r.toJSON()),
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      },
      stats: {
        statusCounts,
        ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
          rating: parseInt(rating),
          count
        })).sort((a, b) => b.rating - a.rating)
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

    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    review.status = req.body.status;
    await review.save();

    // Update product rating (simplified - would need to recalculate)
    res.json({ message: 'Yorum durumu güncellendi', review: review.toJSON() });
  } catch (error) {
    console.error('Admin review status error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }
    const productId = review.productId;
    await review.destroy();
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
    const ids = reviewIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));

    if (!ids.length) {
      return res.status(400).json({ error: 'Geçerli yorum ID bulunamadı' });
    }

    const reviews = await Review.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'productId', 'status'] });
    if (!reviews.length) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    let modifiedCount = 0;
    if (action === 'delete') {
      modifiedCount = await Review.destroy({ where: { id: { [Op.in]: ids } } });
    } else {
      const statusValue = action === 'approve' ? 'approved' : 'rejected';
      const [count] = await Review.update(
        { status: statusValue },
        { where: { id: { [Op.in]: ids } } }
      );
      modifiedCount = count;
    }

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
    const review = await Review.findByPk(req.params.id);

    if (!review) {
      return res.status(404).json({
        error: 'Yorum bulunamadı'
      });
    }

    review.helpful = (review.helpful || 0) + 1;
    await review.save();

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
