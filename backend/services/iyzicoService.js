const iyzipay = require('iyzipay');
const settingsService = require('../src/services/settingsService');

class IyzicoService {
  constructor() {
    this.client = null;
    this.configSignature = null;
  }

  async ensureClient() {
    const paymentConfig = await settingsService.getPaymentConfig();

    if (!paymentConfig.enableIyzico || !paymentConfig.iyzicoApiKey || !paymentConfig.iyzicoSecretKey) {
      throw new Error('Iyzico API anahtarları yapılandırılmamış');
    }

    const signature = JSON.stringify({
      key: paymentConfig.iyzicoApiKey,
      secret: paymentConfig.iyzicoSecretKey,
      baseUrl: paymentConfig.iyzicoBaseUrl
    });

    if (!this.client || this.configSignature !== signature) {
      this.client = new iyzipay({
        apiKey: paymentConfig.iyzicoApiKey,
        secretKey: paymentConfig.iyzicoSecretKey,
        uri: paymentConfig.iyzicoBaseUrl || 'https://sandbox-api.iyzipay.com'
      });
      this.configSignature = signature;
    }

    return this.client;
  }

  async createPaymentForm(paymentData) {
    const client = await this.ensureClient();

    const request = {
      locale: 'tr',
      conversationId: paymentData.conversationId,
      price: paymentData.price.toFixed(2),
      paidPrice: paymentData.price.toFixed(2),
      currency: 'TRY',
      installment: '1',
      basketId: paymentData.basketId,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: paymentData.callbackUrl,
      enabledInstallments: [2, 3, 6, 9],
      buyer: {
        id: paymentData.buyerId,
        name: paymentData.buyerName,
        surname: paymentData.buyerSurname,
        gsmNumber: paymentData.buyerPhone,
        email: paymentData.buyerEmail,
        identityNumber: paymentData.buyerIdentityNumber || '11111111111',
        lastLoginDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
        registrationDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
        registrationAddress: paymentData.buyerAddress,
        city: paymentData.buyerCity,
        country: 'Turkey',
        zipCode: '34000',
        ip: paymentData.buyerIp || '127.0.0.1'
      },
      shippingAddress: {
        contactName: paymentData.shippingName,
        city: paymentData.shippingCity,
        country: 'Turkey',
        address: paymentData.shippingAddress,
        zipCode: '34000'
      },
      billingAddress: {
        contactName: `${paymentData.buyerName} ${paymentData.buyerSurname}`,
        city: paymentData.buyerCity,
        country: 'Turkey',
        address: paymentData.buyerAddress,
        zipCode: '34000'
      },
      basketItems: paymentData.basketItems
    };

    return new Promise((resolve, reject) => {
      client.checkoutFormInitialize.create(request, (err, result) => {
        if (err) {
          console.error('Iyzico payment form creation error:', err);
          reject(err);
        } else if (result.status === 'success') {
          resolve({
            token: result.token,
            paymentPageUrl: result.paymentPageUrl,
            checkoutFormContent: result.checkoutFormContent || null,
            tokenExpireTime: result.tokenExpireTime || null
          });
        } else {
          reject(new Error(result.errorMessage || 'Payment form creation failed'));
        }
      });
    });
  }

  async verifyPayment(token) {
    const client = await this.ensureClient();
    const request = {
      locale: 'tr',
      token
    };

    return new Promise((resolve, reject) => {
      client.checkoutForm.retrieve(request, (err, result) => {
        if (err) {
          console.error('Iyzico payment verification error:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async createRefund(paymentId, amount) {
    const client = await this.ensureClient();
    const request = {
      locale: 'tr',
      conversationId: paymentId,
      paymentTransactionId: paymentId,
      price: amount.toFixed(2),
      currency: 'TRY'
    };

    return new Promise((resolve, reject) => {
      client.refund.create(request, (err, result) => {
        if (err) {
          console.error('Iyzico refund error:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  generateBasketId() {
    return `basket_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

module.exports = new IyzicoService();
