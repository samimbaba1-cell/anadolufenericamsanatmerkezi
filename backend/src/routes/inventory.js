const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(adminAuth);

const buildLowStockExpr = () => ({
  $and: [
    { $gt: ['$minStock', 0] },
    { $gt: ['$stock', 0] },
    { $lte: ['$stock', '$minStock'] }
  ]
});

router.get('/stats', async (req, res) => {
  try {
    const [totals, lowStockCount, outOfStockCount, activeCount, recentUpdates, topCategories] = await Promise.all([
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalInventoryValue: { $sum: { $multiply: ['$stock', '$price'] } },
            totalStockQuantity: { $sum: '$stock' },
            productCount: { $sum: 1 }
          }
        }
      ]),
      Product.countDocuments({ $expr: buildLowStockExpr() }),
      Product.countDocuments({ stock: { $lte: 0 } }),
      Product.countDocuments({ isActive: true }),
      Product.find({ stockUpdatedAt: { $exists: true } })
        .sort({ stockUpdatedAt: -1 })
        .limit(5)
        .select('name stock minStock stockUpdatedAt sku')
        .lean(),
      Product.aggregate([
        {
          $match: { category: { $ne: null } }
        },
        {
          $group: {
            _id: '$category',
            totalStock: { $sum: '$stock' },
            lowStock: {
              $sum: {
                $cond: [{ $and: buildLowStockExpr().$and }, 1, 0]
              }
            }
          }
        },
        { $sort: { lowStock: -1, totalStock: -1 } },
        { $limit: 5 }
      ])
    ]);

    const summary = totals[0] || { totalInventoryValue: 0, totalStockQuantity: 0, productCount: 0 };

    const categoryIds = topCategories.map((item) => item._id);
    const categoryMap = categoryIds.length
      ? await Category.find({ _id: { $in: categoryIds } }).select('name').lean().then((docs) => docs.reduce((acc, doc) => {
          acc[doc._id.toString()] = doc.name;
          return acc;
        }, {}))
      : {};

    res.json({
      totalProducts: summary.productCount || 0,
      activeProducts: activeCount,
      lowStockCount,
      outOfStockCount,
      totalStockQuantity: summary.totalStockQuantity || 0,
      totalInventoryValue: summary.totalInventoryValue || 0,
      recentUpdates,
      criticalCategories: topCategories.map((item) => ({
        categoryId: item._id,
        categoryName: categoryMap[item._id?.toString()] || 'Kategori',
        lowStock: item.lowStock,
        totalStock: item.totalStock
      }))
    });
  } catch (error) {
    console.error('Inventory stats error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/products', [
  query('page').optional().isInt({ min: 1 }).withMessage('Sayfa pozitif olmalı'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit 1-100 arası olmalı'),
  query('category').optional().isMongoId().withMessage('Geçersiz kategori'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Geçersiz durum filtresi'),
  query('sort').optional().isIn(['name', 'stock', 'minStock', 'price', 'stockUpdatedAt']).withMessage('Geçersiz sıralama alanı'),
  query('sortDir').optional().isIn(['asc', 'desc']).withMessage('Geçersiz sıralama yönü')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      lowStock,
      outOfStock,
      sort = 'name',
      sortDir = 'asc'
    } = req.query;

    const baseFilter = {};
    if (category) {
      baseFilter.category = category;
    }
    if (status === 'active') {
      baseFilter.isActive = true;
    } else if (status === 'inactive') {
      baseFilter.isActive = false;
    }

    const andConditions = [];

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      andConditions.push({
        $or: [
          { name: regex },
          { sku: regex },
          { barcode: regex }
        ]
      });
    }

    if (lowStock === 'true' && outOfStock === 'true') {
      andConditions.push({
        $or: [
          { $expr: buildLowStockExpr() },
          { stock: { $lte: 0 } }
        ]
      });
    } else if (lowStock === 'true') {
      andConditions.push({ $expr: buildLowStockExpr() });
    } else if (outOfStock === 'true') {
      andConditions.push({ stock: { $lte: 0 } });
    }

    const filter = { ...baseFilter };
    if (andConditions.length === 1) {
      Object.assign(filter, andConditions[0]);
    } else if (andConditions.length > 1) {
      filter.$and = andConditions;
    }

    const sortFieldMap = {
      name: 'name',
      stock: 'stock',
      minStock: 'minStock',
      price: 'price',
      stockUpdatedAt: 'stockUpdatedAt'
    };

    const sortField = sortFieldMap[sort] || 'name';
    const sortOrder = sortDir === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ [sortField]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter)
    ]);

    const formatted = items.map((item) => ({
      ...item,
      inventoryValue: Number((item.price || 0) * (item.stock || 0)),
      stockStatus: item.stock <= 0 ? 'out' : item.stock <= (item.minStock || 0) && item.minStock > 0 ? 'low' : 'ok'
    }));

    res.json({
      items: formatted,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.patch('/products/:id', [
  body('stock').optional().isInt({ min: 0 }).withMessage('Stok negatif olamaz'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('Minimum stok negatif olamaz'),
  body('note').optional().isLength({ max: 300 }).withMessage('Not 300 karakterden uzun olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const stock = req.body.stock !== undefined ? parseInt(req.body.stock, 10) : undefined;
    const minStock = req.body.minStock !== undefined ? parseInt(req.body.minStock, 10) : undefined;
    const note = req.body.note?.trim();

    if (stock === undefined && minStock === undefined && !note) {
      return res.status(400).json({ error: 'Güncellenecek bilgi bulunamadı' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    if (stock !== undefined) {
      product.stock = stock;
    }
    if (minStock !== undefined) {
      product.minStock = minStock;
    }

    product.stockUpdatedAt = new Date();
    product.stockHistory.push({
      quantity: product.stock,
      minStock: product.minStock,
      note: note || undefined,
      updatedBy: req.user.userId,
      updatedAt: new Date()
    });
    if (product.stockHistory.length > 50) {
      product.stockHistory = product.stockHistory.slice(-50);
    }

    await product.save();
    await product.populate('category', 'name slug');

    res.json({
      message: 'Stok bilgisi güncellendi',
      product
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/products/:id/history', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('name sku stockHistory')
      .populate('stockHistory.updatedBy', 'name email role')
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const history = (product.stockHistory || [])
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 25)
      .map((entry) => ({
        quantity: entry.quantity,
        minStock: entry.minStock,
        note: entry.note || '',
        updatedAt: entry.updatedAt,
        updatedBy: entry.updatedBy
          ? {
              _id: entry.updatedBy._id,
              name: entry.updatedBy.name,
              email: entry.updatedBy.email,
              role: entry.updatedBy.role
            }
          : null
      }));

    res.json({
      product: {
        _id: req.params.id,
        name: product.name,
        sku: product.sku
      },
      history
    });
  } catch (error) {
    console.error('Inventory history error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/bulk', [
  body('action').isIn(['set-stock', 'adjust-stock', 'set-min-stock', 'toggle-active']).withMessage('Geçersiz işlem'),
  body('productIds').isArray({ min: 1 }).withMessage('En az bir ürün seçmelisiniz'),
  body('productIds.*').isMongoId().withMessage('Geçersiz ürün ID'),
  body('value').optional(),
  body('note').optional().isLength({ max: 300 }).withMessage('Not 300 karakterden uzun olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const { productIds, action, value, note } = req.body;
    const numericValue = value !== undefined && value !== null ? Number(value) : undefined;
    const boolValue = typeof value === 'boolean' ? value : value === 'true' || value === true;
    const now = new Date();

    if (['set-stock', 'adjust-stock', 'set-min-stock'].includes(action)) {
      if (!Number.isFinite(numericValue)) {
        return res.status(400).json({ error: 'Geçerli bir sayı değeri girin' });
      }
      if (action !== 'adjust-stock' && numericValue < 0) {
        return res.status(400).json({ error: 'Değer negatif olamaz' });
      }
    }

    if (action === 'toggle-active' && value === undefined) {
      return res.status(400).json({ error: 'Aktif/Pasif değeri belirtilmeli' });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    if (!products.length) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    let updatedCount = 0;

    const appendHistory = (product, historyNote) => {
      const entry = {
        quantity: product.stock,
        minStock: product.minStock,
        note: historyNote || undefined,
        updatedBy: req.user.userId,
        updatedAt: now
      };
      product.stockHistory = product.stockHistory || [];
      product.stockHistory.push(entry);
      if (product.stockHistory.length > 50) {
        product.stockHistory = product.stockHistory.slice(-50);
      }
      product.stockUpdatedAt = now;
    };

    for (const product of products) {
      let historyNote = '';
      switch (action) {
        case 'set-stock': {
          const nextStock = Math.max(0, Math.floor(numericValue));
          product.stock = nextStock;
          historyNote = `Toplu işlem: stok ${nextStock} olarak ayarlandı`;
          appendHistory(product, [historyNote, note].filter(Boolean).join(' - '));
          updatedCount++;
          break;
        }
        case 'adjust-stock': {
          const delta = Math.floor(numericValue);
          if (delta === 0) break;
          const nextStock = Math.max(0, (product.stock || 0) + delta);
          product.stock = nextStock;
          historyNote = `Toplu işlem: stok ${delta > 0 ? `+${delta}` : delta} ile güncellendi`;
          appendHistory(product, [historyNote, note].filter(Boolean).join(' - '));
          updatedCount++;
          break;
        }
        case 'set-min-stock': {
          const nextMin = Math.max(0, Math.floor(numericValue));
          product.minStock = nextMin;
          historyNote = `Toplu işlem: minimum stok ${nextMin} olarak ayarlandı`;
          appendHistory(product, [historyNote, note].filter(Boolean).join(' - '));
          updatedCount++;
          break;
        }
        case 'toggle-active': {
          product.isActive = Boolean(boolValue);
          product.updatedAt = now;
          updatedCount++;
          break;
        }
        default:
          break;
      }
    }

    await Promise.all(products.map((product) => product.save()));

    res.json({
      message: `${updatedCount} ürün güncellendi`,
      updatedCount
    });
  } catch (error) {
    console.error('Inventory bulk update error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
