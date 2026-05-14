const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { auth, adminAuth } = require('../middleware/auth');

router.use(auth);
router.use(adminAuth);

const COUPON_TYPES = ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'];
const CUSTOMER_GROUPS = ['all', 'new_customers', 'returning_customers', 'vip'];

function buildPayload(source, adminId) {
  return {
    code: source.code?.toUpperCase(),
    name: source.name,
    description: source.description,
    type: source.type,
    value: Number(source.value || 0),
    minOrderAmount: Number(source.minOrderAmount || 0),
    maxDiscountAmount: Number(source.maxDiscountAmount || 0),
    usageLimit: Number(source.usageLimit || 0),
    usagePerCustomer: Number(source.usagePerCustomer || 0),
    isActive: source.isActive !== undefined ? Boolean(source.isActive) : true,
    startDate: source.startDate ? new Date(source.startDate) : undefined,
    endDate: source.endDate ? new Date(source.endDate) : undefined,
    customerGroups: source.customerGroups || 'all',
    applicableProducts: Array.isArray(source.applicableProducts) ? source.applicableProducts : [],
    applicableCategories: Array.isArray(source.applicableCategories) ? source.applicableCategories : [],
    buyQuantity: Number(source.buyQuantity || 0),
    getQuantity: Number(source.getQuantity || 0),
    updatedBy: adminId
  };
}

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      customerGroup
    } = req.query;

    const where = {};

    if (search) {
      const searchTerm = search.trim();
      where[Op.or] = [
        { code: { [Op.like]: `%${searchTerm}%` } },
        { name: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }

    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (type && COUPON_TYPES.includes(type)) where.type = type;
    if (customerGroup && CUSTOMER_GROUPS.includes(customerGroup)) {
      // customerGroups is JSON field, would need JSON search
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: items, count: total } = await Coupon.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit)
    });

    const activeCount = await Coupon.count({ where: { ...where, isActive: true } });
    const allCoupons = await Coupon.findAll({ where, attributes: ['value'] });
    const discountAgg = [{ total: allCoupons.reduce((sum, c) => sum + parseFloat(c.value || 0), 0) }];

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalCount: total,
        activeCount,
        totalDiscountValue: discountAgg[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Coupons list error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);

    if (!coupon) {
      return res.status(404).json({ error: 'Kupon bulunamadı' });
    }

    res.json(coupon.toJSON());
  } catch (error) {
    console.error('Coupon detail error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/', [
  body('code').trim().notEmpty().withMessage('Kupon kodu gerekli'),
  body('name').trim().notEmpty().withMessage('Kupon adı gerekli'),
  body('type').isIn(COUPON_TYPES).withMessage('Geçersiz kupon türü'),
  body('value').optional().isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }),
  body('usageLimit').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const payload = buildPayload(req.body, req.user.userId);

    if (payload.type === 'percentage' && (payload.value < 0 || payload.value > 100)) {
      return res.status(400).json({ error: 'Yüzde indirim 0-100 aralığında olmalıdır' });
    }

    if (payload.type === 'free_shipping') {
      payload.value = 0;
    }

    const coupon = await Coupon.create({
      ...payload,
      createdBy: req.user.userId
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Kupon kodu zaten mevcut' });
    }
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id', [
  body('code').optional().trim().notEmpty(),
  body('type').optional().isIn(COUPON_TYPES),
  body('value').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation Error', details: errors.array() });
    }

    const payload = buildPayload(req.body, req.user.userId);

    if (payload.type === 'percentage' && (payload.value < 0 || payload.value > 100)) {
      return res.status(400).json({ error: 'Yüzde indirim 0-100 aralığında olmalıdır' });
    }

    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Kupon bulunamadı' });
    }

    await coupon.update(payload);
    res.json(coupon.toJSON());
  } catch (error) {
    console.error('Update coupon error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Kupon kodu zaten mevcut' });
    }
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Kupon bulunamadı' });
    }

    await coupon.update({ isActive: Boolean(req.body.isActive) });
    res.json(coupon.toJSON());
  } catch (error) {
    console.error('Toggle coupon error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Kupon bulunamadı' });
    }

    await coupon.destroy();
    res.json({ message: 'Kupon silindi' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { code, orderAmount = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Kupon kodu gerekli' });
    }

    const coupon = await Coupon.findOne({ 
      where: { code: code.toUpperCase(), isActive: true } 
    });
    if (!coupon) {
      return res.status(404).json({ error: 'Kupon bulunamadı' });
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({ error: 'Kupon henüz aktif değil' });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({ error: 'Kupon süresi dolmuş' });
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Kupon kullanım limiti dolmuş' });
    }
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ error: `Minimum sipariş tutarı ${coupon.minOrderAmount} TL olmalıdır` });
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (orderAmount * coupon.value) / 100;
      if (coupon.maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    }

    res.json({
      valid: true,
      coupon,
      discountAmount: Math.round(discountAmount * 100) / 100
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
