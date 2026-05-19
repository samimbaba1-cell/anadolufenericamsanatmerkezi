const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
// Load models to ensure associations are registered
require('../models');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { auth, adminAuth } = require('../middleware/auth');
const { normalizeProductPayload } = require('../utils/normalizePayload');

const router = express.Router();

const coerceNumber = (value, { allowFloat = true, fallback } = {}) => {
  if (value === undefined || value === null || value === '') {
    return fallback !== undefined ? fallback : undefined;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fallback !== undefined ? fallback : undefined;
    }
    return allowFloat ? value : Math.trunc(value);
  }
  if (typeof value === 'string') {
    const s = value.trim().replace(/\s/g, '');
    if (s === '') {
      return fallback !== undefined ? fallback : undefined;
    }
    if (!allowFloat) {
      const digits = s.replace(/\D/g, '');
      if (digits === '') {
        return fallback !== undefined ? fallback : undefined;
      }
      const n = parseInt(digits, 10);
      return Number.isNaN(n) ? (fallback !== undefined ? fallback : undefined) : n;
    }
    // Ondalık: noktayı silmek "56.00" -> "5600" yapıyordu; virgülden sonra normalleştir.
    let normalized = s;
    if (normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      const dotCount = (normalized.match(/\./g) || []).length;
      if (dotCount > 1) {
        normalized = normalized.replace(/\./g, '');
      }
    }
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      return fallback !== undefined ? fallback : undefined;
    }
    return parsed;
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
          const numId = parseInt(id);
          return !isNaN(numId) ? numId : null;
        })
        .filter(Boolean)
    )
  ];

  if (!ids.length) return;

  // Count products per brand
  const counts = await Product.findAll({
    where: {
      brandRefId: { [Op.in]: ids }
    },
    attributes: [
      'brandRefId',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total']
    ],
    group: ['brandRefId'],
    raw: true
  });

  const countMap = counts.reduce((acc, curr) => {
    acc[curr.brandRefId] = parseInt(curr.total) || 0;
    return acc;
  }, {});

  await Promise.all(
    ids.map((id) =>
      Brand.update(
        { productCount: countMap[id] || 0 },
        { where: { id } }
      )
    )
  );
};

// @route   GET /api/products
// @desc    Get all products with pagination and filters
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa numarası pozitif olmalı'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arası olmalı'),
  query('category').optional().isInt().withMessage('Geçersiz kategori ID'),
  query('brand').optional().isInt().withMessage('Geçersiz marka ID'),
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
    const where = { isActive: true };

    if (category) {
      where.categoryId = parseInt(category);
    }

    if (brand) {
      where.brandRefId = parseInt(brand);
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      where.stock = { [Op.gt]: 0 };
    }

    const searchTerm = (search || q || '').toString().trim();
    if (searchTerm) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    // Build sort array
    const order = [];
    const sortField = sortBy === 'rating' ? 'rating' : sortBy;
    order.push([sortField, sortOrder === 'asc' ? 'ASC' : 'DESC']);

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get products with pagination
    const { rows: products, count: total } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, as: 'brandRef', attributes: ['id', 'name', 'slug', 'logo'], required: false }
      ],
      order,
      offset,
      limit: parseInt(limit)
    });
    const sanitizedItems = products.map(p => sanitizeProduct(p.toJSON()));

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
  query('category').optional().isInt().withMessage('Geçersiz kategori ID'),
  query('brand').optional().isInt().withMessage('Geçersiz marka ID'),
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

    const where = {};

    if (category) {
      where.categoryId = parseInt(category);
    }

    if (brand) {
      where.brandRefId = parseInt(brand);
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (featured === 'featured') {
      where.isFeatured = true;
    } else if (featured === 'not') {
      where.isFeatured = false;
    }

    if (search) {
      const searchTerm = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { sku: { [Op.like]: `%${searchTerm}%` } },
        { barcode: { [Op.like]: `%${searchTerm}%` } }
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
    const order = [[sortField, sortDir === 'asc' ? 'ASC' : 'DESC'], ['createdAt', 'DESC']];

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: items, count: total } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, as: 'brandRef', attributes: ['id', 'name', 'slug', 'logo'], required: false }
      ],
      order,
      offset,
      limit: parseInt(limit)
    });
    const sanitizedItems = items.map(p => sanitizeProduct(p.toJSON()));

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
  query('q').optional().trim().notEmpty().withMessage('Arama terimi boş olamaz'),
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

    const { q, page = 1, limit = 12 } = req.query;
    
    // If no search term, return empty results
    if (!q || !q.trim()) {
      return res.json({
        items: [],
        page: parseInt(page),
        pages: 0,
        total: 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }
    
    const searchTerm = q.trim();

    // Build simple search filter
    const where = {
      isActive: true,
      [Op.or]: [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ]
    };

    // Simple sort by name
    const order = [['name', 'ASC']];
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Execute simple search query
    const products = await Product.findAll({
      where,
      order,
      limit: parseInt(limit),
      offset
    });
    
    // Get total count
    const count = await Product.count({ where });

    // Convert to JSON and sanitize
    const sanitizedItems = products.map(product => {
      const productJson = product.toJSON();
      return sanitizeProduct(productJson);
    });

    res.json({
      items: sanitizedItems,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      total: count,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    console.error('Search products error stack:', error.stack);
    res.status(500).json({
      error: 'Sunucu hatası',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, as: 'brandRef', attributes: ['id', 'name', 'slug', 'logo'], required: false }
      ]
    });

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json(sanitizeProduct(product.toJSON()));
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
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, as: 'brandRef', attributes: ['id', 'name', 'slug', 'logo'], required: false },
        { model: require('../models/Review'), as: 'reviews', required: false }
      ]
    });

    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    const productJson = product.toJSON();
    if (!productJson.isActive) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    // Get related products
    const relatedProducts = await Product.findAll({
      where: {
        categoryId: productJson.categoryId,
        id: { [Op.ne]: productJson.id },
        isActive: true
      },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false }
      ],
      limit: 4
    });

    const sanitizedProduct = sanitizeProduct(productJson);
    const sanitizedRelated = relatedProducts.map(p => sanitizeProduct(p.toJSON()));

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
  body('category').optional().isInt({ min: 1 }).withMessage('Geçerli kategori ID gerekli'),
  body('brand').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Geçerli marka ID gerekli'),
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

    const payload = normalizeProductPayload({
      ...req.body,
      description: req.body.description || '',
      images: Array.isArray(req.body.images) ? req.body.images : [],
      barcode: req.body.barcode ? String(req.body.barcode).trim() : undefined,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      stockUpdatedAt: new Date()
    });

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
      const brandDoc = await Brand.findByPk(payload.brand);
      if (!brandDoc) {
        return res.status(400).json({ error: 'Geçersiz marka seçimi' });
      }
      payload.brandRefId = brandDoc.id;
      payload.brand = brandDoc.name;
    }

    const product = await Product.create(payload);

    if (product.brandRefId) {
      await syncBrandCounts([product.brandRefId]);
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
    const current = await Product.findByPk(req.params.id, { attributes: ['id', 'brandRefId'] });
    if (!current) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    const updateData = normalizeProductPayload({ ...req.body });
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
        updateData.brandRefId = undefined;
      } else {
        const brandDoc = await Brand.findByPk(updateData.brand);
        if (!brandDoc) {
          return res.status(400).json({ error: 'Geçersiz marka seçimi' });
        }
        updateData.brandRefId = brandDoc.id;
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

    await current.update(updateData);
    
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, as: 'brandRef', attributes: ['id', 'name', 'slug', 'logo'], required: false }
      ]
    });

    if (current.brandRefId || product.brandRefId) {
      await syncBrandCounts([current.brandRefId, product.brandRefId].filter(Boolean));
    }

    res.json({
      message: 'Ürün başarıyla güncellendi',
      product: sanitizeProduct(product.toJSON())
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

    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false },
        { model: Brand, as: 'brandRef', attributes: ['id', 'name', 'slug', 'logo'], required: false }
      ]
    });

    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    await product.update(updates);

    res.json({
      message: 'Ürün durumu güncellendi',
      product: product.toJSON()
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
    const product = await Product.findByPk(req.params.id, {
      attributes: ['id', 'brandRefId']
    });

    if (!product) {
      return res.status(404).json({
        error: 'Ürün bulunamadı'
      });
    }

    const brandRefId = product.brandRefId;
    await product.destroy();

    if (brandRefId) {
      await syncBrandCounts([brandRefId]);
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
