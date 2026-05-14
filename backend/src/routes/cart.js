const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

const router = express.Router();

// In-memory cart storage (in production, use Redis or database)
let carts = {};

// @route   GET /api/cart
// @desc    Get user cart
// @access  Private
router.get('/', auth, (req, res) => {
  try {
    const cart = carts[req.user.userId] || { items: [], total: 0 };
    res.json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', auth, [
  body('product').isInt().withMessage('Geçerli ürün ID gerekli'),
  body('quantity').isInt({ min: 1 }).withMessage('Miktar en az 1 olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { product: productId, quantity } = req.body;

    // Get product
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        error: 'Ürün mevcut değil'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        error: 'Yetersiz stok'
      });
    }

    // Get or create cart
    if (!carts[req.user.userId]) {
      carts[req.user.userId] = { items: [], total: 0 };
    }

    const cart = carts[req.user.userId];
    const productImages = Array.isArray(product.images) ? product.images : [];

    // Check if item already exists
    const existingItem = cart.items.find(item => item.product === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        name: product.name,
        price: parseFloat(product.price),
        image: productImages[0] || '',
        quantity
      });
    }

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      message: 'Ürün sepete eklendi',
      cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/cart/update
// @desc    Update cart item quantity
// @access  Private
router.post('/update', auth, [
  body('product').isInt().withMessage('Geçerli ürün ID gerekli'),
  body('quantity').isInt({ min: 0 }).withMessage('Miktar 0 veya pozitif olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { product: productId, quantity } = req.body;

    if (!carts[req.user.userId]) {
      return res.status(404).json({
        error: 'Sepet bulunamadı'
      });
    }

    const cart = carts[req.user.userId];
    const itemIndex = cart.items.findIndex(item => item.product === productId);

    if (itemIndex === -1) {
      return res.status(404).json({
        error: 'Ürün sepette bulunamadı'
      });
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      message: 'Sepet güncellendi',
      cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/cart/remove
// @desc    Remove item from cart
// @access  Private
router.post('/remove', auth, [
  body('product').isInt().withMessage('Geçerli ürün ID gerekli')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { product: productId } = req.body;

    if (!carts[req.user.userId]) {
      return res.status(404).json({
        error: 'Sepet bulunamadı'
      });
    }

    const cart = carts[req.user.userId];
    cart.items = cart.items.filter(item => item.product !== productId);

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      message: 'Ürün sepetten çıkarıldı',
      cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/cart/clear
// @desc    Clear cart
// @access  Private
router.post('/clear', auth, (req, res) => {
  try {
    carts[req.user.userId] = { items: [], total: 0 };

    res.json({
      message: 'Sepet temizlendi'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
