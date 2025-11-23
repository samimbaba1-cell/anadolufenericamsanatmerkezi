const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const settingsService = require('../services/settingsService');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/orders/admin
// @desc    Get orders for admin panel with filters
// @access  Private (Admin)
router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      source,
      search,
      startDate,
      endDate,
      sort = 'createdAt',
      sortDir = 'desc'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (source) query.source = source;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const userMatches = await User.find({
        $or: [
          { name: regex },
          { email: regex }
        ]
      }).select('_id');

      const userIds = userMatches.map((u) => u._id);

      query.$or = [
        { orderNumber: regex },
        { externalId: regex },
        { 'shippingAddress.firstName': regex },
        { 'shippingAddress.lastName': regex },
        { 'shippingAddress.phone': regex },
      ];

      if (userIds.length > 0) {
        query.$or.push({ user: { $in: userIds } });
      }
    }

    const sortField = ['total', 'createdAt', 'status', 'paymentStatus'].includes(sort) ? sort : 'createdAt';
    const sortOrder = sortDir === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .populate('items.product', 'name images price sku')
        .sort({ [sortField]: sortOrder })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    const amountSummary = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0]
            }
          }
        }
      }
    ]);

    const statusBreakdown = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      items: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalAmount: amountSummary[0]?.totalAmount || 0,
        pendingAmount: amountSummary[0]?.pendingAmount || 0,
        statusBreakdown: statusBreakdown.reduce((acc, cur) => {
          acc[cur._id] = cur.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Admin orders load error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/orders/admin/:id
// @desc    Get order details for admin
// @access  Private (Admin)
router.get('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price sku barcode')
      .lean();

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Admin get order error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.userId
    })
      .populate('items.product', 'name images price')
      .lean();

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/orders
// @desc    Create order
// @access  Private
router.post('/', auth, [
  body('items').isArray({ min: 1 }).withMessage('En az 1 ürün gerekli'),
  body('shippingAddress').isObject().withMessage('Kargo adresi gerekli'),
  body('paymentMethod').isIn(['credit_card', 'bank_transfer', 'cash_on_delivery', 'iyzico']).withMessage('Geçersiz ödeme yöntemi')
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
      items,
      shippingAddress: rawShippingAddress = {},
      billingAddress: rawBillingAddress = {},
      paymentMethod,
      paymentData = {},
      notes,
      shippingCompany: requestedShippingCompany
    } = req.body;

    const normalizeAddress = (address, fallback = {}) => ({
      firstName: address.firstName?.trim() || fallback.firstName || '',
      lastName: address.lastName?.trim() || fallback.lastName || '',
      company: address.company?.trim() || '',
      address1: address.address?.trim() || address.address1?.trim() || fallback.address1 || '',
      address2: address.address2?.trim() || '',
      city: address.city?.trim() || fallback.city || '',
      state: address.state?.trim() || fallback.state || '',
      zipCode: address.zipCode?.trim() || fallback.zipCode || '',
      country: address.country?.trim() || fallback.country || 'Turkey',
      phone: address.phone?.trim() || fallback.phone || ''
    });

    const shippingAddress = normalizeAddress(rawShippingAddress);

    if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.address1 ||
      !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.phone) {
      return res.status(400).json({
        error: 'Teslimat adresi eksik veya geçersiz'
      });
    }

    const billingAddress = rawBillingAddress.sameAsShipping
      ? { ...shippingAddress }
      : normalizeAddress(rawBillingAddress, shippingAddress);

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          error: `Ürün bulunamadı: ${item.product}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Yetersiz stok: ${product.name}`
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    const [shippingConfig, paymentConfig] = await Promise.all([
      settingsService.getShippingConfig(),
      settingsService.getPaymentConfig()
    ]);

    const shippingCompanies = shippingConfig.shippingCompanies || [];
    const selectedShippingCompany = (() => {
      if (requestedShippingCompany && shippingCompanies.includes(requestedShippingCompany)) {
        return requestedShippingCompany;
      }
      if (shippingCompanies.includes(shippingConfig.defaultShippingCompany)) {
        return shippingConfig.defaultShippingCompany;
      }
      return shippingCompanies[0] || 'Standart Kargo';
    })();

    const freeShippingApplied = Boolean(
      shippingConfig.enableFreeShipping &&
      subtotal >= Number(shippingConfig.freeShippingThreshold || 0)
    );

    const shippingCost = freeShippingApplied ? 0 : Number(shippingConfig.shippingCost || 0);

    // Payment validation & snapshot
    const paymentSnapshot = {};
    let paymentStatus = 'pending';

    if (paymentMethod === 'credit_card' || paymentMethod === 'iyzico') {
      if (!paymentConfig.enableIyzico) {
        return res.status(400).json({ error: 'Kredi kartı ile ödeme şu anda kullanılamıyor' });
      }
      paymentSnapshot.gateway = 'iyzico';
    } else if (paymentMethod === 'bank_transfer') {
      if (!paymentConfig.enableBankTransfer) {
        return res.status(400).json({ error: 'Havale/EFT ödemesi devre dışı' });
      }
      const bankAccountId = paymentData.bankAccountId;
      const bankAccount = (paymentConfig.bankAccounts || []).find((account) => {
        if (!account) return false;
        const accountId = account._id ? account._id.toString() : null;
        return accountId === bankAccountId;
      });

      if (!bankAccount) {
        return res.status(400).json({ error: 'Geçersiz banka hesabı seçildi' });
      }

      paymentSnapshot.bankAccount = {
        _id: bankAccount._id,
        bankName: bankAccount.bankName,
        accountName: bankAccount.accountName,
        iban: bankAccount.iban,
        branch: bankAccount.branch,
        accountNumber: bankAccount.accountNumber,
        description: bankAccount.description
      };
    } else if (paymentMethod === 'cash_on_delivery') {
      if (!paymentConfig.enableCashOnDelivery) {
        return res.status(400).json({ error: 'Kapıda ödeme devre dışı' });
      }
    }

    // Calculate totals
    const tax = subtotal * 0.18; // %18 KDV
    const total = subtotal + tax + shippingCost;

    const estimatedDeliveryDate = (() => {
      const days = Number(shippingConfig.estimatedDeliveryDays || 0);
      if (!Number.isFinite(days) || days <= 0) return null;
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    })();

    // Create order
    const order = new Order({
      user: req.user.userId,
      items: orderItems,
      subtotal,
      tax,
      shipping: shippingCost,
      shippingCompany: selectedShippingCompany,
      freeShippingApplied,
      shippingConfig: {
        enableFreeShipping: shippingConfig.enableFreeShipping,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        shippingCost: shippingConfig.shippingCost,
        estimatedDeliveryDays: shippingConfig.estimatedDeliveryDays
      },
      total,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentStatus,
      paymentSnapshot,
      notes,
      estimatedDelivery: estimatedDeliveryDate || undefined
    });

    await order.save();

    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    await order.populate('items.product', 'name images price');

    res.status(201).json({
      message: 'Sipariş başarıyla oluşturuldu',
      order,
      bankAccount: paymentSnapshot.bankAccount || null,
      freeShippingApplied,
      shippingCost,
      shippingCompany: selectedShippingCompany,
      estimatedDelivery: order.estimatedDelivery
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private (Admin)
router.put('/:id/payment', auth, adminAuth, [
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Geçersiz ödeme durumu'),
  body('paymentId').optional().isString().isLength({ max: 120 }).withMessage('Ödeme ID en fazla 120 karakter olabilir'),
  body('paymentNote').optional().isString().isLength({ max: 500 }).withMessage('Not 500 karakterden uzun olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { paymentStatus, paymentId, paymentNote } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images price sku barcode')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        order.paymentSnapshot = order.paymentSnapshot || {};
        order.paymentSnapshot.settledAt = new Date();
      } else if (paymentStatus === 'pending') {
        if (order.paymentSnapshot) {
          delete order.paymentSnapshot.settledAt;
        }
      }
    }

    if (typeof paymentId === 'string') {
      order.paymentId = paymentId.trim();
    }

    if (paymentNote !== undefined) {
      order.paymentSnapshot = order.paymentSnapshot || {};
      order.paymentSnapshot.manualNote = paymentNote ? paymentNote.trim() : '';
      order.paymentSnapshot.manualNoteUpdatedAt = new Date();
      order.paymentSnapshot.manualNoteUpdatedBy = req.user.userId;
    }

    await order.save();

    res.json({
      message: 'Ödeme bilgileri güncellendi',
      order
    });
  } catch (error) {
    console.error('Update order payment error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.put('/:id/shipping', auth, adminAuth, [
  body('shippingCompany').optional().isString().isLength({ max: 120 }).withMessage('Kargo firması 120 karakteri geçemez'),
  body('trackingNumber').optional().isString().isLength({ max: 160 }).withMessage('Takip numarası 160 karakteri geçemez'),
  body('estimatedDelivery').optional({ checkFalsy: true }).isISO8601().withMessage('Geçersiz teslimat tarihi'),
  body('delivered').optional().isBoolean().withMessage('Teslimat bilgisi geçersiz'),
  body('shippingNote').optional().isString().isLength({ max: 500 }).withMessage('Not 500 karakteri geçemez')
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
      shippingCompany,
      trackingNumber,
      estimatedDelivery,
      delivered,
      shippingNote
    } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images price sku barcode')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    if (shippingCompany !== undefined) {
      order.shippingCompany = shippingCompany ? shippingCompany.trim() : order.shippingCompany;
    }

    if (trackingNumber !== undefined) {
      order.trackingNumber = trackingNumber ? trackingNumber.trim() : '';
    }

    if (estimatedDelivery !== undefined) {
      order.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : undefined;
    }

    if (typeof delivered === 'boolean') {
      order.deliveredAt = delivered ? (order.deliveredAt || new Date()) : undefined;
      if (delivered && order.status !== 'delivered' && !['cancelled', 'refunded'].includes(order.status)) {
        order.status = 'delivered';
      } else if (!delivered && order.status === 'delivered') {
        order.status = 'shipped';
      }
    }

    if (shippingNote !== undefined) {
      order.shippingSnapshot = order.shippingSnapshot || {};
      order.shippingSnapshot.manualNote = shippingNote ? shippingNote.trim() : '';
      order.shippingSnapshot.manualNoteUpdatedAt = new Date();
      order.shippingSnapshot.manualNoteUpdatedBy = req.user.userId;
    }

    await order.save();

    res.json({
      message: 'Kargo bilgileri güncellendi',
      order
    });
  } catch (error) {
    console.error('Update order shipping error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

router.put('/:id/status', auth, adminAuth, [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).withMessage('Geçersiz durum')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items.product', 'name images price');

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    res.json({
      message: 'Sipariş durumu güncellendi',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
