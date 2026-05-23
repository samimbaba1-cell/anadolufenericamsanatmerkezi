const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const { normalizeCategoryPayload } = require('../utils/normalizePayload');
const { slugifyTr, safeDecodeURIComponent, normalizeSlugKey, slugsMatch } = require('../utils/slugify');

function findCategoryBySlugInList(categoryRows, rawSlug) {
  const decoded = safeDecodeURIComponent(rawSlug);

  if (/^\d+$/.test(decoded)) {
    const byId = categoryRows.find((row) => {
      const json = row.toJSON ? row.toJSON() : row;
      return String(json.id) === decoded;
    });
    if (byId) return byId;
  }

  const target = normalizeSlugKey(decoded);
  return categoryRows.find((row) => {
    const json = row.toJSON ? row.toJSON() : row;
    if (json.name && normalizeSlugKey(json.name) === target) return true;
    if (json.slug && slugsMatch(decoded, json.slug)) return true;
    if (json.name && slugsMatch(decoded, json.name)) return true;
    return false;
  });
}

async function attachProductCounts(categories) {
  const countRows = await Product.findAll({
    attributes: ['categoryId', [fn('COUNT', col('id')), 'count']],
    where: { isActive: true, categoryId: { [Op.ne]: null } },
    group: ['categoryId'],
    raw: true
  });
  const countMap = {};
  for (const row of countRows) {
    if (row.categoryId != null) {
      countMap[row.categoryId] = parseInt(row.count, 10) || 0;
    }
  }
  return categories.map((c) => {
    const json = c.toJSON();
    const seoSlug = slugifyTr(json.name || "");
    return {
      ...json,
      seoSlug,
      productCount: countMap[json.id] ?? json.productCount ?? 0
    };
  });
}

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.all !== 'true') {
      where.isActive = true;
    }

    const categories = await Category.findAll({
      where,
      include: [
        { model: Category, as: 'parent', attributes: ['id', 'name'], required: false }
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    if (req.query.slug) {
      const found = findCategoryBySlugInList(categories, req.query.slug);
      if (!found) {
        return res.status(404).json({ error: 'Kategori bulunamadı' });
      }
      const [withCount] = await attachProductCounts([found]);
      return res.json(withCount);
    }

    res.json(await attachProductCounts(categories));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/categories/fix-slugs
// @desc    Tüm kategori slug'larını isimden yeniden üret (admin)
// @access  Private (Admin)
router.post('/fix-slugs', auth, adminAuth, async (req, res) => {
  try {
    const categories = await Category.findAll();
    let updated = 0;
    for (const cat of categories) {
      const next = slugifyTr(cat.name);
      if (next && cat.slug !== next) {
        await cat.update({ slug: next });
        updated += 1;
      }
    }
    res.json({
      message: `${updated} kategori slug güncellendi`,
      updated
    });
  } catch (error) {
    console.error('Fix category slugs error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// @route   GET /api/categories/:id
// @desc    Get single category with products
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    const categoryJson = category.toJSON();
    if (!categoryJson.isActive) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    // Get products in this category
    const products = await Product.findAll({
      where: {
        categoryId: categoryJson.id,
        isActive: true
      },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'], required: false }
      ],
      limit: 20
    });

    res.json({
      category: categoryJson,
      products: products.map(p => p.toJSON())
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

    const category = await Category.create(normalizeCategoryPayload(req.body));

    res.status(201).json({
      message: 'Kategori başarıyla oluşturuldu',
      category: category.toJSON()
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
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    await category.update(normalizeCategoryPayload(req.body));

    res.json({
      message: 'Kategori başarıyla güncellendi',
      category: category.toJSON()
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

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    await category.update(updates);

    res.json({
      message: 'Kategori durumu güncellendi',
      category: category.toJSON()
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
    const productCount = await Product.count({ 
      where: { categoryId: req.params.id } 
    });
    if (productCount > 0) {
      return res.status(400).json({
        error: 'Bu kategoride ürünler bulunuyor. Önce ürünleri silin veya başka kategoriye taşıyın.'
      });
    }

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: 'Kategori bulunamadı'
      });
    }

    await category.destroy();

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
