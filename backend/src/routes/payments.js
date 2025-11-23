const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');

const router = express.Router();

// Iyzico API Configuration
const IYZICO_API_KEY = process.env.IYZICO_API_KEY || 'sandbox-your-api-key';
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || 'sandbox-your-secret-key';
const IYZICO_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.iyzipay.com' 
  : 'https://sandbox-api.iyzipay.com';

// @route   POST /api/payments/iyzico/initialize
// @desc    Initialize Iyzico payment
// @access  Private
router.post('/iyzico/initialize', auth, [
  body('orderId').isMongoId().withMessage('Geçersiz sipariş ID'),
  body('price').isFloat({ min: 0.01 }).withMessage('Geçersiz fiyat'),
  body('currency').isIn(['TRY', 'USD', 'EUR']).withMessage('Geçersiz para birimi')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { orderId, price, currency = 'TRY' } = req.body;
    const user = req.user;

    // Find order
    const order = await Order.findOne({ 
      _id: orderId, 
      user: user._id,
      status: 'pending'
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Iyzico payment request
    const paymentRequest = {
      locale: 'tr',
      conversationId: orderId,
      price: price.toString(),
      paidPrice: price.toString(),
      currency: currency,
      installment: '1',
      basketId: orderId,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: `${process.env.FRONTEND_URL}/payment/success`,
      enabledInstallments: [2, 3, 6, 9],
      buyer: {
        id: user._id.toString(),
        name: user.firstName,
        surname: user.lastName,
        gsmNumber: user.phone || '+905551234567',
        email: user.email,
        identityNumber: user.tcNo || '11111111111',
        lastLoginDate: new Date().toISOString(),
        registrationDate: user.createdAt.toISOString(),
        registrationAddress: order.shippingAddress.address,
        city: order.shippingAddress.city,
        country: 'Turkey',
        zipCode: order.shippingAddress.postalCode,
        ip: req.ip
      },
      shippingAddress: {
        contactName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        city: order.shippingAddress.city,
        country: 'Turkey',
        address: order.shippingAddress.address,
        zipCode: order.shippingAddress.postalCode
      },
      billingAddress: {
        contactName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        city: order.shippingAddress.city,
        country: 'Turkey',
        address: order.shippingAddress.address,
        zipCode: order.shippingAddress.postalCode
      },
      basketItems: order.items.map(item => ({
        id: item.product.toString(),
        name: item.name,
        category1: item.category || 'E-ticaret',
        category2: 'Ürün',
        itemType: 'PHYSICAL',
        price: (item.price * item.quantity).toString(),
        subMerchantKey: null,
        subMerchantPrice: null
      }))
    };

    // For demo purposes, return mock response
    // In production, make actual API call to Iyzico
    const mockResponse = {
      status: 'success',
      paymentId: `iyzico_${Date.now()}`,
      paymentPageUrl: `${IYZICO_BASE_URL}/payment/checkout-form/initialize`,
      token: `token_${Date.now()}`,
      conversationId: orderId
    };

    // Update order with payment info
    order.paymentMethod = 'iyzico';
    order.paymentId = mockResponse.paymentId;
    order.paymentStatus = 'pending';
    await order.save();

    res.json(mockResponse);

  } catch (error) {
    console.error('Iyzico initialize error:', error);
    res.status(500).json({ error: 'Ödeme başlatma hatası' });
  }
});

// @route   POST /api/payments/iyzico/callback
// @desc    Handle Iyzico payment callback
// @access  Public
router.post('/iyzico/callback', async (req, res) => {
  try {
    const { token, status, paymentId, conversationId } = req.body;

    if (status === 'success') {
      // Find and update order
      const order = await Order.findById(conversationId);
      if (order) {
        order.paymentStatus = 'completed';
        order.status = 'confirmed';
        order.paidAt = new Date();
        await order.save();
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Iyzico callback error:', error);
    res.status(500).json({ error: 'Callback işleme hatası' });
  }
});

// @route   GET /api/payments/iyzico/status/:paymentId
// @desc    Check payment status
// @access  Private
router.get('/iyzico/status/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const order = await Order.findOne({ 
      paymentId,
      user: req.user._id 
    });

    if (!order) {
      return res.status(404).json({ error: 'Ödeme bulunamadı' });
    }

    res.json({
      paymentId: order.paymentId,
      status: order.paymentStatus,
      orderStatus: order.status,
      paidAt: order.paidAt
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Ödeme durumu sorgulama hatası' });
  }
});

module.exports = router;
