const express = require('express');
const { body, validationResult, query } = require('express-validator');
const mongoose = require('mongoose');
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
    .map((brand) => brand?._id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!ids.length) return brands;

  const counts = await Product.aggregate([
    { $match: { brandRef: { $in: ids } } },
    { $group: { _id: '$brandRef', total: { $sum: 1 } } }
  ]);

  const countMap = counts.reduce((acc, item) => {
    acc[item._id.toString()] = item.total;
    return acc;
  }, {});

  return brands.map((brand) => ({
    ...brand,
    productCount: countMap[brand._id.toString()] || 0
  }));
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
      const filter = {};
      if (all !== 'true') {
        filter.isActive = true;
      }
      if (search?.trim()) {
        filter.name = { $regex: new RegExp(search.trim(), 'i') };
      }

      const brands = await Brand.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      const list =
        includeCounts === 'true' || all === 'true'
          ? await attachProductCounts(brands)
          : brands;

      res.json(list);
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).lean();
    if (!brand) {
      return res.status(404).json({ error: 'Marka bulunamadı' });
    }
    const [withCount] = await attachProductCounts([brand]);
    res.json(withCount || brand);
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
    payload.slug = Brand.normalizeSlug(payload.name);

    const brand = new Brand(payload);
    await brand.save();

    res.status(201).json({
      message: 'Marka oluşturuldu',
      brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
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

    payload.slug = Brand.normalizeSlug(payload.name);

    const brand = await Brand.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });

    if (!brand) {
      return res.status(404).json({ error: 'Marka bulunamadı' });
    }

    res.json({
      message: 'Marka güncellendi',
      brand
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

      const brand = await Brand.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      if (!brand) {
        return res.status(404).json({ error: 'Marka bulunamadı' });
      }
      res.json({
        message: 'Marka durumu güncellendi',
        brand
      });
    } catch (error) {
      console.error('Update brand status error:', error);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const productCount = await Product.countDocuments({ brandRef: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        error: 'Bu markaya bağlı ürünler mevcut. Önce ürünleri güncelleyin.'
      });
    }

    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Marka bulunamadı' });
    }

    res.json({ message: 'Marka silindi' });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

