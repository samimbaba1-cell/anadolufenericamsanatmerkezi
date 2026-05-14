const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

const normalizeBoolean = (value, defaultValue) => {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return defaultValue;
};

const attachProductCounts = async (brands) => {
  if (!Array.isArray(brands) || brands.length === 0) {
    return brands;
  }
  const ids = brands
    .map((brand) => brand?.id)
    .filter((id) => id != null);

  if (!ids.length) return brands;

  const counts = await Product.findAll({
    where: { brandRefId: { [Op.in]: ids } },
    attributes: [
      'brandRefId',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total']
    ],
    group: ['brandRefId'],
    raw: true
  });

  const countMap = counts.reduce((acc, item) => {
    acc[item.brandRefId] = parseInt(item.total) || 0;
    return acc;
  }, {});

  return brands.map((brand) => {
    const brandId = brand.id;
    return {
      ...brand,
      id: brandId, // Ensure id is preserved
      productCount: countMap[brandId] || 0
    };
  });
};

router.get(
  '/',
  [
    query('search').optional().isString(),
    query('all').optional().isIn(['true', 'false']),
    query('includeCounts').optional().isIn(['true', 'false'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation Error',
          details: errors.array()
        });
      }

      const { search, all, includeCounts } = req.query;
      const where = {};
      if (all !== 'true') {
        where.isActive = true;
      }
      if (search?.trim()) {
        where.name = { [Op.like]: `%${search.trim()}%` };
      }

      const brands = await Brand.findAll({
        where,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });

      const brandsJson = brands.map(b => b.toJSON());
      const list =
        includeCounts === 'true' || all === 'true'
          ? await attachProductCounts(brandsJson)
          : brandsJson;

      res.json(list);
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Marka bulunamadı' });
    }
    const brandJson = brand.toJSON();
    const [withCount] = await attachProductCounts([brandJson]);
    res.json(withCount || brandJson);
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

const brandValidators = [
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Marka adı 1-120 karakter arası olmalı'),
  body('description').optional({ checkFalsy: true }).isLength({ max: 500 }).withMessage('Açıklama 500 karakterden uzun olamaz'),
  body('website').optional({ checkFalsy: true }).isURL({ require_tld: false }).withMessage('Geçerli bir web adresi girin'),
  body('logo').optional({ checkFalsy: true }).isString(),
  body('banner').optional({ checkFalsy: true }).isString(),
  body('country').optional({ checkFalsy: true }).isLength({ max: 60 }).withMessage('Ülke 60 karakterden uzun olamaz'),
  body('metaTitle').optional({ checkFalsy: true }).isLength({ max: 60 }).withMessage('Meta başlık 60 karakteri geçemez'),
  body('metaDescription').optional({ checkFalsy: true }).isLength({ max: 160 }).withMessage('Meta açıklama 160 karakteri geçemez'),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sıralama 0 veya üzeri olmalı'),
  body('isActive').optional().isBoolean().withMessage('isActive boolean olmalı')
];

router.post('/', auth, adminAuth, brandValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const payload = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || undefined,
      website: req.body.website?.trim() || undefined,
      logo: req.body.logo?.trim() || undefined,
      banner: req.body.banner?.trim() || undefined,
      country: req.body.country?.trim() || undefined,
      metaTitle: req.body.metaTitle?.trim() || undefined,
      metaDescription: req.body.metaDescription?.trim() || undefined,
      sortOrder: Number.isFinite(req.body.sortOrder) ? req.body.sortOrder : Number(req.body.sortOrder) || 0,
      isActive: normalizeBoolean(req.body.isActive, true)
    };
    
    // Slug will be auto-generated by model hook, but we can set it explicitly
    payload.slug = Brand.normalizeSlug(payload.name);

    const brand = await Brand.create(payload);

    res.status(201).json({
      message: 'Marka oluşturuldu',
      brand: brand.toJSON()
    });
  } catch (error) {
    console.error('Create brand error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: error.errors?.[0]?.path === 'slug' 
          ? 'Bu isimde bir marka zaten mevcut' 
          : 'Bu marka zaten mevcut'
      });
    }
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

router.put('/:id', auth, adminAuth, brandValidators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const payload = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || undefined,
      website: req.body.website?.trim() || undefined,
      logo: req.body.logo?.trim() || undefined,
      banner: req.body.banner?.trim() || undefined,
      country: req.body.country?.trim() || undefined,
      metaTitle: req.body.metaTitle?.trim() || undefined,
      metaDescription: req.body.metaDescription?.trim() || undefined,
      sortOrder: Number.isFinite(req.body.sortOrder) ? req.body.sortOrder : Number(req.body.sortOrder) || 0,
      isActive: normalizeBoolean(req.body.isActive, true)
    };

    // Slug will be auto-generated by model hook, but we can set it explicitly
    payload.slug = Brand.normalizeSlug(payload.name);

    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Marka bulunamadı' });
    }

    await brand.update(payload);

    res.json({
      message: 'Marka güncellendi',
      brand: brand.toJSON()
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.patch(
  '/:id/status',
  auth,
  adminAuth,
  [
    body('isActive').optional().isBoolean().withMessage('Durum bilgisi geçersiz'),
    body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sıralama 0 veya üzeri olmalı')
  ],
  async (req, res) => {
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

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'Güncellenecek bilgi bulunamadı' });
      }

      const brand = await Brand.findByPk(req.params.id);
      if (!brand) {
        return res.status(404).json({ error: 'Marka bulunamadı' });
      }
      await brand.update(updates);
      res.json({
        message: 'Marka durumu güncellendi',
        brand: brand.toJSON()
      });
    } catch (error) {
      console.error('Update brand status error:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const productCount = await Product.count({ where: { brandRefId: req.params.id } });
    if (productCount > 0) {
      return res.status(400).json({
        error: 'Bu markaya bağlı ürünler mevcut. Önce ürünleri güncelleyin.'
      });
    }

    const brand = await Brand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Marka bulunamadı' });
    }

    await brand.destroy();
    res.json({ message: 'Marka silindi' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

