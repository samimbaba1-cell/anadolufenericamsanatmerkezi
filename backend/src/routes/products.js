const express = require('express');
const { body, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const coerceNumber = (value, { allowFloat = true, fallback } = {}) => {
  if (value === undefined || value === null || value === "") {
    return fallback !== undefined ? fallback : undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback !== undefined ? fallback : undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\./g, '').replace(',', '.');
    const parsed = allowFloat ? Number(normalized) : parseInt(normalized, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback !== undefined ? fallback : undefined;
};

const sanitizeProduct = (product) => {
  if (!product) return product;
  const doc = product.toObject ? product.toObject() : { ...product };
  doc.price = coerceNumber(doc.price, { allowFloat: true, fallback: 0 }) ?? 0;
  doc.originalPrice = coerceNumber(doc.originalPrice, { allowFloat: true });
  doc.stock = coerceNumber(doc.stock, { allowFloat: false, fallback: 0 }) ?? 0;
  doc.minStock = coerceNumber(doc.minStock, { allowFloat: false });
  doc.weight = coerceNumber(doc.weight, { allowFloat: true });
  if (doc.dimensions) {
    doc.dimensions = {
      length: coerceNumber(doc.dimensions.length, { allowFloat: true }),
      width: coerceNumber(doc.dimensions.width, { allowFloat: true }),
      height: coerceNumber(doc.dimensions.height, { allowFloat: true })
    };
  }
  return doc;
};

const syncBrandCounts = async (brandIds = []) => {
  const ids = [
    ...new Set(
      brandIds
        .map((id) => {
          if (!id) return null;
          const str = id.toString();
          return mongoose.Types.ObjectId.isValid(str) ? str : null;
        })
        .filter(Boolean)
    )
  ];

  if (!ids.length) return;

  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const counts = await Product.aggregate([
    { $match: { brandRef: { $in: objectIds } } },
    { $group: { _id: '$brandRef', total: { $sum: 1 } } }
  ]);

  const countMap = counts.reduce((acc, curr) => {
    acc[curr._id.toString()] = curr.total;
    return acc;
  }, {});

  await Promise.all(
    ids.map((id) =>
      Brand.findByIdAndUpdate(id, { productCount: countMap[id] || 0 })
    )
  );
};

// @route   GET /api/products
// @desc    Get all products with pagination and filters
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif olmalı'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arası olmalı'),
  query('category').optional().isMongoId().withMessage('Geçersiz kategori ID'),
  query('brand').optional().isMongoId().withMessage('Geçersiz marka ID'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min fiyat negatif olamaz'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max fiyat negatif olamaz'),
  query('sortBy').optional().isIn(['name', 'price', 'createdAt', 'rating']).withMessage('Geçersiz sıralama'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Geçersiz sıralama yönü'),
  query('inStock').optional().isBoolean().withMessage('inStock boolean olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
      search,
      q
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (brand) {
      filter.brandRef = brand;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    const searchTerm = (search || q || '').toString().trim();
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      filter.$or = [
        { name: regex },
        { description: regex },
        { tags: regex }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get products with pagination
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .populate('brandRef', 'name slug logo')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    const sanitizedItems = products.map(sanitizeProduct);

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      items: sanitizedItems,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/products/admin
// @desc    Get products for admin panel with filters
// @access  Private (Admin)
router.get('/admin', auth, adminAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif olmalı'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arası olmalı'),
  query('category').optional().isMongoId().withMessage('Geçersiz kategori ID'),
  query('brand').optional().isMongoId().withMessage('Geçersiz marka ID'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Geçersiz durum filtresi'),
  query('featured').optional().isIn(['featured', 'not']).withMessage('Geçersiz öne çıkarma filtresi'),
  query('sort').optional().isIn(['createdAt', 'name', 'price', 'stock', 'updatedAt']).withMessage('Geçersiz sıralama alanı'),
  query('sortDir').optional().isIn(['asc', 'desc']).withMessage('Geçersiz sıralama yönü')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      status,
      featured,
      sort = 'createdAt',
      sortDir = 'desc'
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (brand) {
      filter.brandRef = brand;
    }

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (featured === 'featured') {
      filter.isFeatured = true;
    } else if (featured === 'not') {
      filter.isFeatured = false;
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { sku: regex },
        { barcode: regex }
      ];
    }

    const sortFieldMap = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      price: 'price',
      stock: 'stock'
    };
    const sortField = sortFieldMap[sort] || 'createdAt';
    const sortOrder = sortDir === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('brandRef', 'name slug logo')
        .sort({ [sortField]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);
    const sanitizedItems = items.map(sanitizeProduct);

    res.json({
      items: sanitizedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin products load error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', [
  query('q').notEmpty().withMessage('Arama terimi gerekli'),
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif olmalı'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arası olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { q, page = 1, limit = 12, category, minPrice, maxPrice, sortBy = 'relevance' } = req.query;

    // Build search filter
    const filter = { isActive: true };

    // Prefer text search if index exists; otherwise fallback to regex
    let useTextSearch = Boolean(q && q.trim());
    if (useTextSearch) {
      try {
        // Set text search; if index missing Mongo will still accept but may be slow,
        // we keep a regex fallback below if no items are found.
        filter.$text = { $search: q };
      } catch (_) {
        useTextSearch = false;
      }
    }

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Build sort
    let sort = {};
    if (sortBy === 'relevance' && useTextSearch) {
      // Only use textScore if text search is actually being used
      sort = { score: { $meta: 'textScore' } };
    } else if (sortBy === 'priceAsc') {
      sort = { price: 1 };
    } else if (sortBy === 'priceDesc') {
      sort = { price: -1 };
    } else if (sortBy === 'newest') {
      sort = { createdAt: -1 };
    } else if (sortBy === 'rating') {
      sort = { 'rating.average': -1 };
    } else {
      // Default sort if relevance requested but text search not available
      sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let products = [];
    let total = 0;

    // Try text search first, fallback to regex if it fails
    if (useTextSearch) {
      try {
        products = await Product.find(filter)
          .populate('category', 'name slug')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
        total = await Product.countDocuments(filter);
      } catch (textError) {
        // If text search fails (e.g., no text index), fallback to regex
        console.warn('Text search failed, falling back to regex:', textError.message);
        useTextSearch = false;
      }
    }

    // Fallback to regex if text search failed or no results
    if (!useTextSearch || (products?.length || 0) === 0) {
      const regex = new RegExp(q.trim(), 'i');
      const regexFilter = { isActive: true };
      if (category) regexFilter.category = category;
      if (minPrice || maxPrice) {
        regexFilter.price = {};
        if (minPrice) regexFilter.price.$gte = parseFloat(minPrice);
        if (maxPrice) regexFilter.price.$lte = parseFloat(maxPrice);
      }
      regexFilter.$or = [{ name: regex }, { description: regex }, { tags: regex }];

      // Use default sort for regex search
      const regexSort = sortBy === 'priceAsc' ? { price: 1 } : 
                       sortBy === 'priceDesc' ? { price: -1 } : 
                       sortBy === 'newest' ? { createdAt: -1 } : 
                       sortBy === 'rating' ? { 'rating.average': -1 } : 
                       { createdAt: -1 };

      products = await Product.find(regexFilter)
        .populate('category', 'name slug')
        .sort(regexSort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      total = await Product.countDocuments(regexFilter);
    }

    const sanitizedItems = products.map(sanitizeProduct);

    res.json({
      items: sanitizedItems,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.get('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('brandRef', 'name slug logo')
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json(sanitizeProduct(product));
  } catch (error) {
    console.error('Admin get product error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('brandRef', 'name slug logo')
      .populate('reviews')
      .lean();

    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    if (!product.isActive) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isActive: true
    })
      .limit(4)
      .populate('category', 'name slug')
      .lean();

    const sanitizedProduct = sanitizeProduct(product);
    const sanitizedRelated = relatedProducts.map(sanitizeProduct);

    res.json({
      product: sanitizedProduct,
      relatedProducts: sanitizedRelated
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/products
// @desc    Create product
// @access  Private (Admin)
router.post('/', auth, adminAuth, [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Ürün adı 1-200 karakter arası olmalı'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Açıklama 2000 karakterden fazla olamaz'),
  body('price').isFloat({ min: 0 }).withMessage('Fiyat negatif olamaz'),
  body('category').optional().isMongoId().withMessage('Geçerli kategori ID gerekli'),
  body('brand').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Geçerli marka ID gerekli'),
  body('stock').isInt({ min: 0 }).withMessage('Stok negatif olamaz'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('Minimum stok negatif olamaz'),
  body('images').optional().isArray().withMessage('Görseller dizi formatında olmalıdır'),
  body('barcode').optional({ checkFalsy: true }).trim().matches(/^\d{13}$/).withMessage('Barkod 13 haneli olmalıdır'),
  body('expiryDate').optional({ checkFalsy: true }).isISO8601().withMessage('Geçerli bir son kullanma tarihi girin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const payload = {
      ...req.body,
      description: req.body.description || '',
      images: Array.isArray(req.body.images) ? req.body.images : [],
      barcode: req.body.barcode ? String(req.body.barcode).trim() : undefined,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      stockUpdatedAt: new Date()
    };

    payload.price = coerceNumber(req.body.price, { allowFloat: true, fallback: 0 }) ?? 0;
    payload.originalPrice = coerceNumber(req.body.originalPrice, { allowFloat: true });
    payload.stock = coerceNumber(req.body.stock, { allowFloat: false, fallback: 0 }) ?? 0;
    payload.minStock = coerceNumber(req.body.minStock, { allowFloat: false });
    payload.weight = coerceNumber(req.body.weight, { allowFloat: true });
    const dimLength = coerceNumber(req.body.dimensions?.length ?? req.body.length, { allowFloat: true });
    const dimWidth = coerceNumber(req.body.dimensions?.width ?? req.body.width, { allowFloat: true });
    const dimHeight = coerceNumber(req.body.dimensions?.height ?? req.body.height, { allowFloat: true });
    if (dimLength !== undefined || dimWidth !== undefined || dimHeight !== undefined) {
      payload.dimensions = {
        length: dimLength,
        width: dimWidth,
        height: dimHeight
      };
    }

    if (payload.brand === '' || payload.brand === null) {
      payload.brand = undefined;
      payload.brandRef = undefined;
    } else if (payload.brand) {
      const brandDoc = await Brand.findById(payload.brand);
      if (!brandDoc) {
        return res.status(400).json({ error: 'Geçersiz marka seçimi' });
      }
      payload.brandRef = brandDoc._id;
      payload.brand = brandDoc.name;
    }

    const product = new Product(payload);
    await product.save();

    await product.populate('category', 'name slug');
    await product.populate('brandRef', 'name slug logo');

    if (product.brandRef) {
      await syncBrandCounts([product.brandRef]);
    }

    res.status(201).json({
      message: 'Ürün başarıyla oluşturuldu',
      product: sanitizeProduct(product)
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const current = await Product.findById(req.params.id).select('brandRef');
    if (!current) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    const updateData = { ...req.body };
    delete updateData.stockHistory;

    if (updateData.stock !== undefined) {
      const parsedStock = parseInt(updateData.stock, 10);
      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
          error: 'Validation Error',
          details: [{ msg: 'Stok negatif olamaz', path: 'stock' }]
        });
      }
      updateData.stock = parsedStock;
      updateData.stockUpdatedAt = new Date();
    }

    if (updateData.minStock !== undefined) {
      const parsedMin = parseInt(updateData.minStock, 10);
      if (Number.isNaN(parsedMin) || parsedMin < 0) {
        return res.status(400).json({
          error: 'Validation Error',
          details: [{ msg: 'Minimum stok negatif olamaz', path: 'minStock' }]
        });
      }
      updateData.minStock = parsedMin;
    }

    if (updateData.expiryDate === '' || updateData.expiryDate === null) {
      updateData.expiryDate = undefined;
    } else if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    if (updateData.brand !== undefined) {
      if (updateData.brand === '' || updateData.brand === null) {
        updateData.brand = undefined;
        updateData.brandRef = undefined;
      } else {
        const brandDoc = await Brand.findById(updateData.brand);
        if (!brandDoc) {
          return res.status(400).json({ error: 'Geçersiz marka seçimi' });
        }
        updateData.brandRef = brandDoc._id;
        updateData.brand = brandDoc.name;
      }
    }

    updateData.price = coerceNumber(req.body.price ?? updateData.price, { allowFloat: true });
    updateData.originalPrice = coerceNumber(req.body.originalPrice ?? updateData.originalPrice, { allowFloat: true });
    if (updateData.stock !== undefined) {
      const parsedStock = coerceNumber(updateData.stock, { allowFloat: false });
      if (parsedStock === undefined || parsedStock < 0) {
        return res.status(400).json({
          error: 'Validation Error',
          details: [{ msg: 'Stok negatif olamaz', path: 'stock' }]
        });
      }
      updateData.stock = parsedStock;
      updateData.stockUpdatedAt = new Date();
    }

    if (updateData.minStock !== undefined) {
      const parsedMin = coerceNumber(updateData.minStock, { allowFloat: false });
      if (parsedMin === undefined || parsedMin < 0) {
        return res.status(400).json({
          error: 'Validation Error',
          details: [{ msg: 'Minimum stok negatif olamaz', path: 'minStock' }]
        });
      }
      updateData.minStock = parsedMin;
    }

    const dimLength = coerceNumber(updateData.dimensions?.length ?? updateData.length, { allowFloat: true });
    const dimWidth = coerceNumber(updateData.dimensions?.width ?? updateData.width, { allowFloat: true });
    const dimHeight = coerceNumber(updateData.dimensions?.height ?? updateData.height, { allowFloat: true });
    if (dimLength !== undefined || dimWidth !== undefined || dimHeight !== undefined) {
      updateData.dimensions = {
        length: dimLength,
        width: dimWidth,
        height: dimHeight
      };
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('category', 'name slug')
      .populate('brandRef', 'name slug logo');

    await syncBrandCounts([current.brandRef, product.brandRef?._id]);

    res.json({
      message: 'Ürün başarıyla güncellendi',
      product: sanitizeProduct(product)
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private (Admin)
router.patch('/:id/status', auth, adminAuth, [
  body('isActive').optional().isBoolean().withMessage('isActive boolean olmalı'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured boolean olmalı')
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
    if (req.body.isFeatured !== undefined) {
      updates.isFeatured = req.body.isFeatured;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Güncellenecek durum bulunamadı' });
    }

    updates.updatedAt = new Date();

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    )
      .populate('category', 'name slug')
      .populate('brandRef', 'name slug logo');

    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    res.json({
      message: 'Ürün durumu güncellendi',
      product
    });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    if (product.brandRef) {
      await syncBrandCounts([product.brandRef]);
    }

    res.json({
      message: 'Ürün başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
