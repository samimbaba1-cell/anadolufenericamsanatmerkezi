const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const iyzicoService = require('../../services/iyzicoService');

const router = express.Router();

const normalizeMoney = (value) => {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const buildOrderBasketTotal = (items = []) => {
  return normalizeMoney(
    items.reduce((sum, item) => {
      const price = normalizeMoney(item.price || 0);
      const quantity = Number.parseInt(item.quantity || 1, 10);
      return sum + (price * (Number.isFinite(quantity) ? quantity : 1));
    }, 0)
  );
};

const getOrderExpectedTotal = (order) => {
  const explicitTotal = normalizeMoney(order.total);
  if (explicitTotal > 0) {
    return explicitTotal;
  }

  const basketTotal = buildOrderBasketTotal(order.items || []);
  const shipping = normalizeMoney(order.shipping);
  const tax = normalizeMoney(order.tax);
  const discount = normalizeMoney(order.discount);
  return normalizeMoney(basketTotal + shipping + tax - discount);
};

const buildIyzicoBasketItems = (order) => {
  const baseItems = (order.items || []).map((item, idx) => ({
    id: String(item.product || item.productId || idx),
    name: (item.name || 'Ürün').substring(0, 100),
    category1: 'Ürün',
    category2: 'Genel',
    itemType: 'PHYSICAL',
    price: normalizeMoney(
      normalizeMoney(item.price || 0) * (Number.parseInt(item.quantity || 1, 10) || 1)
    )
  }));

  const basketItems = baseItems.filter((item) => item.price > 0);
  const shipping = normalizeMoney(order.shipping);
  const tax = normalizeMoney(order.tax);
  const discount = normalizeMoney(order.discount);

  if (shipping > 0) {
    basketItems.push({
      id: `shipping_${order.id}`,
      name: 'Kargo',
      category1: 'Hizmet',
      category2: 'Kargo',
      itemType: 'VIRTUAL',
      price: shipping
    });
  }

  if (tax > 0) {
    basketItems.push({
      id: `tax_${order.id}`,
      name: 'Vergi',
      category1: 'Hizmet',
      category2: 'Vergi',
      itemType: 'VIRTUAL',
      price: tax
    });
  }

  if (discount > 0 && basketItems.length > 0) {
    let remainingDiscount = discount;

    for (let index = basketItems.length - 1; index >= 0 && remainingDiscount > 0; index -= 1) {
      const currentPrice = normalizeMoney(basketItems[index].price);
      if (currentPrice <= 0) continue;

      const appliedDiscount = Math.min(currentPrice, remainingDiscount);
      basketItems[index].price = normalizeMoney(currentPrice - appliedDiscount);
      remainingDiscount = normalizeMoney(remainingDiscount - appliedDiscount);
    }
  }

  const expectedTotal = getOrderExpectedTotal(order);
  const currentTotal = normalizeMoney(
    basketItems.reduce((sum, item) => sum + normalizeMoney(item.price), 0)
  );
  const delta = normalizeMoney(expectedTotal - currentTotal);

  if (basketItems.length > 0 && delta !== 0) {
    const lastItem = basketItems[basketItems.length - 1];
    lastItem.price = normalizeMoney(lastItem.price + delta);
  }

  return basketItems.map((item) => ({
    ...item,
    price: normalizeMoney(item.price).toFixed(2)
  }));
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
};

const getFrontendBaseUrl = () => {
  return (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
};

const getBackendBaseUrl = (req) => {
  if (process.env.BACKEND_PUBLIC_URL) {
    return process.env.BACKEND_PUBLIC_URL.replace(/\/+$/, '');
  }

  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${process.env.PORT || 3000}`;
  return `${protocol}://${host}`.replace(/\/+$/, '');
};

const shouldRespondWithJson = (req) => {
  if (req.is('application/json')) return true;
  if (req.xhr) return true;

  const accept = req.headers.accept || '';
  return accept.includes('application/json') && !accept.includes('text/html');
};

// @route   POST /api/payments/iyzico/initialize
// @desc    Initialize Iyzico payment (sandbox/production)
// @access  Private
router.post('/iyzico/initialize', auth, [
  body('orderId').isInt().withMessage('Geçersiz sipariş ID'),
  body('currency').optional().isIn(['TRY', 'USD', 'EUR'])
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

    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: user.userId,
        status: 'pending'
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    const expectedTotal = getOrderExpectedTotal(order);
    if (expectedTotal <= 0) {
      return res.status(400).json({
        error: 'Geçersiz sipariş toplamı',
        message: 'Sipariş toplamı ödeme için uygun değil.'
      });
    }

    if (typeof price !== 'undefined') {
      const requestedPrice = normalizeMoney(price);
      if (requestedPrice !== expectedTotal) {
        return res.status(400).json({
          error: 'Ödeme tutarı uyuşmuyor',
          message: 'İstemciden gelen ödeme tutarı sipariş toplamı ile eşleşmiyor.'
        });
      }
    }

    const ship = order.shippingAddress || {};
    const addr = ship.address1 || ship.address || '';
    const contactName = [ship.firstName, ship.lastName].filter(Boolean).join(' ').trim() || 'Müşteri';

    const paymentData = {
      conversationId: String(orderId),
      price: expectedTotal,
      basketId: String(orderId),
      buyerId: String(user.userId),
      buyerName: (user.name || 'Müşteri').trim().split(' ')[0] || 'Müşteri',
      buyerSurname: (user.name || '').trim().split(' ').slice(1).join(' ') || 'Kullanıcı',
      buyerPhone: ship.phone || user.profilePhone || '+905551234567',
      buyerEmail: user.email || '',
      buyerIdentityNumber: '11111111111',
      buyerAddress: addr,
      buyerCity: ship.city || 'Istanbul',
      buyerIp: getClientIp(req),
      shippingName: contactName,
      shippingCity: ship.city || 'Istanbul',
      shippingAddress: addr,
      basketItems: buildIyzicoBasketItems(order)
    };

    paymentData.callbackUrl = `${getBackendBaseUrl(req)}/api/payments/iyzico/callback`;

    const paymentInit = await iyzicoService.createPaymentForm(paymentData);
    const paymentPageUrl = paymentInit?.paymentPageUrl;

    await order.update({
      paymentMethod: 'iyzico',
      paymentId: `iyzico_${orderId}_${Date.now()}`,
      paymentStatus: 'pending',
      paymentSnapshot: {
        ...(order.paymentSnapshot || {}),
        provider: 'iyzico',
        requestedAmount: expectedTotal,
        initializedAt: new Date().toISOString(),
        callbackUrl: paymentData.callbackUrl,
        checkoutFormToken: paymentInit?.token || null,
        tokenExpireTime: paymentInit?.tokenExpireTime || null
      }
    });

    res.json({
      status: 'success',
      paymentPageUrl,
      orderId,
      conversationId: orderId
    });
  } catch (error) {
    console.error('Iyzico initialize error:', error);
    res.status(500).json({
      error: 'Ödeme başlatma hatası',
      message: 'Ödeme başlatılırken bir sorun oluştu.'
    });
  }
});

// @route   POST /api/payments/iyzico/callback
// @desc    Handle Iyzico 3DS callback (token ile ödeme sonucu)
// @access  Public
router.post('/iyzico/callback', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Geçersiz callback',
        message: 'Ödeme doğrulama token değeri zorunludur.'
      });
    }

    let result;
    try {
      result = await iyzicoService.verifyPayment(token);
    } catch (verificationError) {
      console.error('Iyzico payment verification failed:', verificationError);
      return res.status(400).json({
        error: 'Ödeme doğrulanamadı',
        message: 'Geçersiz veya süresi dolmuş ödeme doğrulama token değeri.'
      });
    }
    const orderId = result?.conversationId ? parseInt(String(result.conversationId), 10) : null;

    if (!orderId || Number.isNaN(orderId)) {
      return res.status(400).json({
        error: 'Geçersiz ödeme sonucu',
        message: 'Ödeme sonucu sipariş ile eşleştirilemedi.'
      });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Sipariş bulunamadı'
      });
    }

    const expectedTotal = getOrderExpectedTotal(order);
    const paidPrice = normalizeMoney(result?.paidPrice || result?.price);
    const paymentStatus = String(result?.paymentStatus || '').toUpperCase();
    const verificationSucceeded =
      result?.status === 'success' &&
      (paymentStatus === '' || paymentStatus === 'SUCCESS') &&
      paidPrice > 0 &&
      paidPrice === expectedTotal;

    if (!verificationSucceeded) {
      await order.update({
        paymentStatus: 'failed',
        paymentSnapshot: {
          ...(order.paymentSnapshot || {}),
          provider: 'iyzico',
          lastVerificationAt: new Date().toISOString(),
          lastVerificationStatus: result?.status || 'failed',
          checkoutFormStatus: result?.paymentStatus || null,
          lastPaidPrice: paidPrice || null
        }
      });

      if (!shouldRespondWithJson(req)) {
        return res.redirect(`${getFrontendBaseUrl()}/payment/error?reason=iyzico-verification`);
      }

      return res.status(400).json({
        error: 'Ödeme doğrulanamadı',
        message: 'Ödeme sonucu sipariş toplamı ile doğrulanamadı.'
      });
    }

    await order.update({
      paymentStatus: 'paid',
      status: 'confirmed',
      paidAt: new Date(),
      paymentId: result.paymentId || order.paymentId,
      paymentSnapshot: {
        ...(order.paymentSnapshot || {}),
        provider: 'iyzico',
        paymentId: result.paymentId || order.paymentId,
        paymentTransactionId: result.paymentTransactionId || null,
        lastVerificationAt: new Date().toISOString(),
        lastVerificationStatus: result.status,
        checkoutFormStatus: result.paymentStatus || null,
        lastPaidPrice: paidPrice
      }
    });

    if (!shouldRespondWithJson(req)) {
      return res.redirect(`${getFrontendBaseUrl()}/payment/success?orderId=${orderId}`);
    }

    res.json({ status: 'ok', orderId: orderId && !isNaN(orderId) ? orderId : undefined });
  } catch (error) {
    console.error('Iyzico callback error:', error);

    if (!shouldRespondWithJson(req)) {
      return res.redirect(`${getFrontendBaseUrl()}/payment/error?reason=iyzico-callback`);
    }

    res.status(500).json({
      error: 'Callback işleme hatası',
      message: 'Ödeme sonucu işlenirken bir hata oluştu.'
    });
  }
});

// @route   GET /api/payments/iyzico/status/:paymentId
// @desc    Check payment status
// @access  Private
router.get('/iyzico/status/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const order = await Order.findOne({ 
      where: {
        paymentId,
        userId: req.user.userId 
      }
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
