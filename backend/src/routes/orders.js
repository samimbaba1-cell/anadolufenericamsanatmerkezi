const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
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
    const orders = await Order.findAll({
      where: { userId: req.user.userId },
      order: [['createdAt', 'DESC']]
    });

    res.json(orders.map(o => o.toJSON()));
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

    const where = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (source) where.source = source;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    if (search) {
      const searchTerm = search.trim();
      const userMatches = await User.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${searchTerm}%` } },
            { email: { [Op.like]: `%${searchTerm}%` } }
          ]
        },
        attributes: ['id']
      });

      const userIds = userMatches.map((u) => u.id);
      const searchConditions = [
        { orderNumber: { [Op.like]: `%${searchTerm}%` } },
        { externalId: { [Op.like]: `%${searchTerm}%` } }
      ];

      if (userIds.length > 0) {
        searchConditions.push({ userId: { [Op.in]: userIds } });
      }

      where[Op.or] = searchConditions;
    }

    const sortField = ['total', 'createdAt', 'status', 'paymentStatus'].includes(sort) ? sort : 'createdAt';
    const order = [[sortField, sortDir === 'asc' ? 'ASC' : 'DESC']];
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: orders, count: total } = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }
      ],
      order,
      offset,
      limit: parseInt(limit)
    });

    // Amount summary
    const allOrders = await Order.findAll({ where, attributes: ['total', 'status'] });
    const amountSummary = {
      totalAmount: allOrders.reduce((sum, o) => {
        const orderJson = o.toJSON ? o.toJSON() : o;
        return sum + parseFloat(orderJson.total || 0);
      }, 0),
      pendingAmount: allOrders
        .filter(o => {
          const orderJson = o.toJSON ? o.toJSON() : o;
          return orderJson.status === 'pending';
        })
        .reduce((sum, o) => {
          const orderJson = o.toJSON ? o.toJSON() : o;
          return sum + parseFloat(orderJson.total || 0);
        }, 0)
    };

    // Status breakdown
    const statusBreakdown = {};
    allOrders.forEach(o => {
      const orderJson = o.toJSON ? o.toJSON() : o;
      const status = orderJson.status;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    res.json({
      items: orders.map(o => o.toJSON ? o.toJSON() : o),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalAmount: amountSummary.totalAmount || 0,
        pendingAmount: amountSummary.pendingAmount || 0,
        statusBreakdown
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
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePhone'], required: false }
      ]
    });

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    // Load products for items
    const orderJson = order.toJSON();
    if (orderJson.items && Array.isArray(orderJson.items)) {
      const productIds = orderJson.items.map(item => item.product).filter(Boolean);
      if (productIds.length > 0) {
        const products = await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          attributes: ['id', 'name', 'images', 'price', 'sku', 'barcode']
        });
        const productMap = {};
        products.forEach(p => {
          productMap[p.id] = p.toJSON();
        });
        orderJson.items = orderJson.items.map(item => ({
          ...item,
          productData: productMap[item.product] || null
        }));
      }
    }

    res.json(orderJson);
  } catch (error) {
    console.error('Admin get order error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/orders/admin/:id
// @desc    Siparişi kalıcı sil (yalnızca admin)
// @access  Private (Admin)
router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Geçersiz sipariş numarası' });
    }
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }
    await order.destroy();
    res.json({ message: 'Sipariş silindi', id });
  } catch (error) {
    console.error('Admin delete order error:', error);
    res.status(500).json({ error: 'Sipariş silinemedi' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    // Load products for items
    const orderJson = order.toJSON();
    if (orderJson.items && Array.isArray(orderJson.items)) {
      const productIds = orderJson.items.map(item => item.product).filter(Boolean);
      if (productIds.length > 0) {
        const products = await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          attributes: ['id', 'name', 'images', 'price']
        });
        const productMap = {};
        products.forEach(p => {
          productMap[p.id] = p.toJSON();
        });
        orderJson.items = orderJson.items.map(item => ({
          ...item,
          productData: productMap[item.product] || null
        }));
      }
    }

    res.json(orderJson);
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
      const product = await Product.findByPk(item.product);
      if (!product) {
        return res.status(400).json({
          error: `Ürün bulunamadı: ${item.product}`
        });
      }

      const productJson = product.toJSON();
      if (productJson.stock < item.quantity) {
        return res.status(400).json({
          error: `Yetersiz stok: ${productJson.name}`
        });
      }

      const itemTotal = parseFloat(productJson.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: productJson.id,
        name: productJson.name,
        quantity: item.quantity,
        price: parseFloat(productJson.price),
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

    // Generate order number
    const orderCount = await Order.count();
    const orderNumber = `ORD-${Date.now()}-${orderCount + 1}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      userId: req.user.userId,
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

    // Update product stock
    for (const item of orderItems) {
      const product = await Product.findByPk(item.product);
      if (product) {
        const currentStock = parseFloat(product.stock || 0);
        await product.update({ stock: Math.max(0, currentStock - item.quantity) });
      }
    }

    // Load products for response
    const orderJson = order.toJSON();
    if (orderJson.items && Array.isArray(orderJson.items)) {
      const productIds = orderJson.items.map(item => item.product).filter(Boolean);
      if (productIds.length > 0) {
        const products = await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          attributes: ['id', 'name', 'images', 'price']
        });
        const productMap = {};
        products.forEach(p => {
          productMap[p.id] = p.toJSON();
        });
        orderJson.items = orderJson.items.map(item => ({
          ...item,
          productData: productMap[item.product] || null
        }));
      }
    }

    res.status(201).json({
      message: 'Sipariş başarıyla oluşturuldu',
      order: orderJson,
      bankAccount: paymentSnapshot.bankAccount || null,
      freeShippingApplied,
      shippingCost,
      shippingCompany: selectedShippingCompany,
      estimatedDelivery: orderJson.estimatedDelivery
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

    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePhone'], required: false }
      ]
    });

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    const orderJson = order.toJSON();
    const updateData = {};

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      const paymentSnapshot = orderJson.paymentSnapshot || {};
      if (paymentStatus === 'paid') {
        paymentSnapshot.settledAt = new Date();
      } else if (paymentStatus === 'pending') {
        delete paymentSnapshot.settledAt;
      }
      updateData.paymentSnapshot = paymentSnapshot;
    }

    if (typeof paymentId === 'string') {
      updateData.paymentId = paymentId.trim();
    }

    if (paymentNote !== undefined) {
      const paymentSnapshot = orderJson.paymentSnapshot || {};
      paymentSnapshot.manualNote = paymentNote ? paymentNote.trim() : '';
      paymentSnapshot.manualNoteUpdatedAt = new Date();
      paymentSnapshot.manualNoteUpdatedBy = req.user.userId;
      updateData.paymentSnapshot = paymentSnapshot;
    }

    await order.update(updateData);

    const updatedOrder = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePhone'], required: false }
      ]
    });

    res.json({
      message: 'Ödeme bilgileri güncellendi',
      order: updatedOrder ? updatedOrder.toJSON() : null
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

    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePhone'], required: false }
      ]
    });

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    const orderJson = order.toJSON();
    const updateData = {};

    if (shippingCompany !== undefined) {
      updateData.shippingCompany = shippingCompany ? shippingCompany.trim() : orderJson.shippingCompany;
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber ? trackingNumber.trim() : '';
    }

    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    }

    if (typeof delivered === 'boolean') {
      updateData.deliveredAt = delivered ? (orderJson.deliveredAt || new Date()) : null;
      if (delivered && orderJson.status !== 'delivered' && !['cancelled', 'refunded'].includes(orderJson.status)) {
        updateData.status = 'delivered';
      } else if (!delivered && orderJson.status === 'delivered') {
        updateData.status = 'shipped';
      }
    }

    if (shippingNote !== undefined) {
      const shippingSnapshot = orderJson.shippingSnapshot || {};
      shippingSnapshot.manualNote = shippingNote ? shippingNote.trim() : '';
      shippingSnapshot.manualNoteUpdatedAt = new Date();
      shippingSnapshot.manualNoteUpdatedBy = req.user.userId;
      updateData.shippingSnapshot = shippingSnapshot;
    }

    await order.update(updateData);

    const updatedOrder = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'profilePhone'], required: false }
      ]
    });

    res.json({
      message: 'Kargo bilgileri güncellendi',
      order: updatedOrder ? updatedOrder.toJSON() : null
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

    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    await order.update({ status });
    const orderJson = order.toJSON();

    res.json({
      message: 'Sipariş durumu güncellendi',
      order: orderJson
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Sunucu hatası'
    });
  }
});

module.exports = router;
