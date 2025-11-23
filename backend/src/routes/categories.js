const express = require('express');
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.all !== 'true') {
      filter.isActive = true;
    }

    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .populate('parent', 'name')
      .lean();

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/categories/:id
// @desc    Get single category with products
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    if (!category.isActive) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    // Get products in this category
    const products = await Product.find({
      category: category._id,
      isActive: true
    })
      .populate('category', 'name slug')
      .limit(20)
      .lean();

    res.json({
      category,
      products
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/categories
// @desc    Create category
// @access  Private (Admin)
router.post('/', auth, adminAuth, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Kategori adı 1-100 karakter arası olmalı'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Açıklama 500 karakterden fazla olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const category = new Category(req.body);
    await category.save();

    res.status(201).json({
      message: 'Kategori başarıyla oluşturuldu',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    res.json({
      message: 'Kategori başarıyla güncellendi',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.patch('/:id/status', auth, adminAuth, [
  body('isActive').optional().isBoolean().withMessage('Durum bilgisi geçersiz'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sıra numarası 0 veya üzeri olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const updates = {};
    if (req.body.isActive !== undefined) {
      updates.isActive = req.body.isActive;
    }
    if (req.body.sortOrder !== undefined) {
      updates.sortOrder = parseInt(req.body.sortOrder, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Güncellenecek bilgi bulunamadı' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    res.json({
      message: 'Kategori durumu güncellendi',
      category
    });
  } catch (error) {
    console.error('Update category status error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (Admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    // Check if category has products
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        error: 'Bu kategoride ürünler bulunuyor. Önce ürünleri silin veya başka kategoriye taşıyın.'
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    res.json({
      message: 'Kategori başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
