const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { auth, adminAuth } = require('../middleware/auth');
const { sequelize } = require('../config/database');

const router = express.Router();

router.use(auth);
router.use(adminAuth);

router.get('/stats', async (req, res) => {
  try {
    // Total inventory stats using raw SQL
    const [totals] = await sequelize.query(`
      SELECT 
        COUNT(*) as productCount,
        SUM(stock) as totalStockQuantity,
        SUM(stock * price) as totalInventoryValue
      FROM products
    `, { type: Sequelize.QueryTypes.SELECT });

    // Low stock count (stock > 0 AND stock <= min_stock AND min_stock > 0)
    const lowStockCount = await Product.count({
      where: {
        [Op.and]: [
          { minStock: { [Op.gt]: 0 } },
          { stock: { [Op.gt]: 0 } },
          Sequelize.literal('stock <= min_stock')
        ]
      }
    });

    // Out of stock count
    const outOfStockCount = await Product.count({
      where: { stock: { [Op.lte]: 0 } }
    });

    // Active products count
    const activeCount = await Product.count({
      where: { isActive: true }
    });

    // Recent updates
    const recentUpdates = await Product.findAll({
      where: { stockUpdatedAt: { [Op.ne]: null } },
      attributes: ['id', 'name', 'stock', 'minStock', 'stockUpdatedAt', 'sku'],
      order: [['stockUpdatedAt', 'DESC']],
      limit: 5
    });

    // Top categories with low stock (using raw SQL for complex aggregation)
    const topCategories = await sequelize.query(`
      SELECT
        category_id as categoryId,
        SUM(stock) as totalStock,
        SUM(CASE
          WHEN min_stock > 0 AND stock > 0 AND stock <= min_stock THEN 1
          ELSE 0
        END) as lowStock
      FROM products
      WHERE category_id IS NOT NULL
      GROUP BY category_id
      ORDER BY lowStock DESC, totalStock DESC
      LIMIT 5
    `, { type: Sequelize.QueryTypes.SELECT });

    // Get category names
    const categoryIds = Array.isArray(topCategories) ? topCategories.map(item => item.categoryId).filter(Boolean) : [];
    const categories = categoryIds.length > 0
      ? await Category.findAll({
          where: { id: { [Op.in]: categoryIds } },
          attributes: ['id', 'name']
        })
      : [];
    
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat.name;
    });

    const summary = totals || { totalInventoryValue: 0, totalStockQuantity: 0, productCount: 0 };

    res.json({
      totalProducts: parseInt(summary.productCount) || 0,
      activeProducts: activeCount,
      lowStockCount,
      outOfStockCount,
      totalStockQuantity: parseFloat(summary.totalStockQuantity) || 0,
      totalInventoryValue: parseFloat(summary.totalInventoryValue) || 0,
      recentUpdates: recentUpdates.map(p => p.toJSON()),
      criticalCategories: topCategories.map((item) => ({
        categoryId: item.categoryId,
        categoryName: categoryMap[item.categoryId] || 'Kategori',
        lowStock: parseInt(item.lowStock) || 0,
        totalStock: parseFloat(item.totalStock) || 0
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
  query('category').optional().isInt().withMessage('Geçersiz kategori'),
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

    const where = {};
    
    if (category) {
      where.categoryId = parseInt(category);
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      const searchTerm = search.trim();
      where[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { sku: { [Op.like]: `%${searchTerm}%` } },
        { barcode: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    if (lowStock === 'true' && outOfStock === 'true') {
      where[Op.or] = [
        ...(where[Op.or] || []),
        Sequelize.literal('(min_stock > 0 AND stock > 0 AND stock <= min_stock)'),
        { stock: { [Op.lte]: 0 } }
      ];
    } else if (lowStock === 'true') {
      where[Op.and] = [
        ...(where[Op.and] || []),
        { minStock: { [Op.gt]: 0 } },
        { stock: { [Op.gt]: 0 } },
        Sequelize.literal('stock <= min_stock')
      ];
    } else if (outOfStock === 'true') {
      where.stock = { [Op.lte]: 0 };
    }

    const sortFieldMap = {
      name: 'name',
      stock: 'stock',
      minStock: 'minStock',
      price: 'price',
      stockUpdatedAt: 'stockUpdatedAt'
    };

    const sortField = sortFieldMap[sort] || 'name';
    const order = [[sortField, sortDir === 'desc' ? 'DESC' : 'ASC'], ['createdAt', 'DESC']];
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const { rows: items, count: total } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false }
      ],
      order,
      offset,
      limit: limitNum
    });

    const formatted = items.map((item) => {
      const itemJson = item.toJSON();
      const price = parseFloat(itemJson.price || 0);
      const stock = parseInt(itemJson.stock || 0);
      const minStock = parseInt(itemJson.minStock || 0);
      return {
        ...itemJson,
        inventoryValue: price * stock,
        stockStatus: stock <= 0 ? 'out' : (stock <= minStock && minStock > 0 ? 'low' : 'ok')
      };
    });

    res.json({
      items: formatted,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
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

    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false }
      ]
    });
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const productJson = product.toJSON();
    const updateData = {};
    
    if (stock !== undefined) {
      updateData.stock = stock;
    }
    if (minStock !== undefined) {
      updateData.minStock = minStock;
    }

    updateData.stockUpdatedAt = new Date();
    
    // Update stock history
    const stockHistory = Array.isArray(productJson.stockHistory) ? [...productJson.stockHistory] : [];
    stockHistory.push({
      quantity: updateData.stock !== undefined ? updateData.stock : productJson.stock,
      minStock: updateData.minStock !== undefined ? updateData.minStock : productJson.minStock,
      note: note || undefined,
      updatedBy: req.user.userId,
      updatedAt: new Date()
    });
    if (stockHistory.length > 50) {
      stockHistory.splice(0, stockHistory.length - 50);
    }
    updateData.stockHistory = stockHistory;

    await product.update(updateData);
    const updatedProduct = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false }
      ]
    });

    res.json({
      message: 'Stok bilgisi güncellendi',
      product: updatedProduct ? updatedProduct.toJSON() : null
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/products/:id/history', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      attributes: ['id', 'name', 'sku', 'stockHistory']
    });

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const productJson = product.toJSON();
    const stockHistory = Array.isArray(productJson.stockHistory) ? productJson.stockHistory : [];
    
    // Get user IDs from history
    const userIds = stockHistory
      .map(entry => entry.updatedBy)
      .filter(Boolean)
      .filter((id, index, self) => self.indexOf(id) === index);
    
    // Load users
    const User = require('../models/User');
    const users = userIds.length > 0
      ? await User.findAll({
          where: { id: { [Op.in]: userIds } },
          attributes: ['id', 'name', 'email', 'role']
        })
      : [];
    
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.toJSON();
    });

    const history = stockHistory
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 25)
      .map((entry) => ({
        quantity: entry.quantity,
        minStock: entry.minStock,
        note: entry.note || '',
        updatedAt: entry.updatedAt,
        updatedBy: entry.updatedBy && userMap[entry.updatedBy]
          ? {
              id: userMap[entry.updatedBy].id,
              name: userMap[entry.updatedBy].name,
              email: userMap[entry.updatedBy].email,
              role: userMap[entry.updatedBy].role
            }
          : null
      }));

    res.json({
      product: {
        id: productJson.id,
        name: productJson.name,
        sku: productJson.sku
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
  body('productIds.*').isInt().withMessage('Geçersiz ürün ID'),
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

    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds.map(id => parseInt(id)) } }
    });
    if (!products.length) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    let updatedCount = 0;

    const appendHistory = (productJson, historyNote, newStock, newMinStock) => {
      const stockHistory = Array.isArray(productJson.stockHistory) ? [...productJson.stockHistory] : [];
      stockHistory.push({
        quantity: newStock !== undefined ? newStock : productJson.stock,
        minStock: newMinStock !== undefined ? newMinStock : productJson.minStock,
        note: historyNote || undefined,
        updatedBy: req.user.userId,
        updatedAt: now
      });
      if (stockHistory.length > 50) {
        stockHistory.splice(0, stockHistory.length - 50);
      }
      return stockHistory;
    };

    for (const product of products) {
      const productJson = product.toJSON();
      let historyNote = '';
      const updateData = {};
      
      switch (action) {
        case 'set-stock': {
          const nextStock = Math.max(0, Math.floor(numericValue));
          updateData.stock = nextStock;
          updateData.stockUpdatedAt = now;
          historyNote = `Toplu işlem: stok ${nextStock} olarak ayarlandı`;
          updateData.stockHistory = appendHistory(productJson, [historyNote, note].filter(Boolean).join(' - '), nextStock, undefined);
          await product.update(updateData);
          updatedCount++;
          break;
        }
        case 'adjust-stock': {
          const delta = Math.floor(numericValue);
          if (delta === 0) break;
          const nextStock = Math.max(0, (productJson.stock || 0) + delta);
          updateData.stock = nextStock;
          updateData.stockUpdatedAt = now;
          historyNote = `Toplu işlem: stok ${delta > 0 ? `+${delta}` : delta} ile güncellendi`;
          updateData.stockHistory = appendHistory(productJson, [historyNote, note].filter(Boolean).join(' - '), nextStock, undefined);
          await product.update(updateData);
          updatedCount++;
          break;
        }
        case 'set-min-stock': {
          const nextMin = Math.max(0, Math.floor(numericValue));
          updateData.minStock = nextMin;
          updateData.stockUpdatedAt = now;
          historyNote = `Toplu işlem: minimum stok ${nextMin} olarak ayarlandı`;
          updateData.stockHistory = appendHistory(productJson, [historyNote, note].filter(Boolean).join(' - '), undefined, nextMin);
          await product.update(updateData);
          updatedCount++;
          break;
        }
        case 'toggle-active': {
          updateData.isActive = Boolean(boolValue);
          await product.update(updateData);
          updatedCount++;
          break;
        }
        default:
          break;
      }
    }

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
