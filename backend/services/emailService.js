const nodemailer = require('nodemailer');
const settingsService = require('./settingsService');

class EmailService {
  constructor() {
    this.transporter = null;
    this.lastSignature = null;
  }

  async getTransporter() {
    const emailSettings = await settingsService.getEmailConfig();
    if (!emailSettings.enableSmtp || !emailSettings.user || !emailSettings.password) {
      throw new Error('SMTP configuration is disabled or incomplete');
    }

    const signature = JSON.stringify({
      host: emailSettings.host,
      port: emailSettings.port,
      secure: emailSettings.secure,
      user: emailSettings.user
    });

    if (!this.transporter || this.lastSignature !== signature) {
      this.transporter = nodemailer.createTransport({
        host: emailSettings.host,
        port: emailSettings.port,
        secure: Boolean(emailSettings.secure),
        auth: {
          user: emailSettings.user,
          pass: emailSettings.password
        }
      });
      this.lastSignature = signature;
    }

    return {
      transporter: this.transporter,
      config: emailSettings
    };
  }

  async sendOrderConfirmation(order, user) {
    let transporter;
    let emailConfig;
    try {
      const result = await this.getTransporter();
      transporter = result.transporter;
      emailConfig = result.config;
    } catch (error) {
      console.error('Email disabled or misconfigured:', error.message);
      return;
    }

    const { items, total, shippingAddress, _id } = order;
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.productData?.name || 'Ürün'}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ₺${(item.productData?.price || 0).toFixed(2)}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ₺${((item.productData?.price || 0) * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sipariş Onayı - ${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; }
          .total { font-size: 18px; font-weight: bold; color: #2563eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}</h1>
            <h2>Sipariş Onayı</h2>
          </div>
          
          <div class="content">
            <p>Merhaba ${user.name || 'Değerli Müşterimiz'},</p>
            <p>Siparişiniz başarıyla alınmıştır. Sipariş detayları aşağıdadır:</p>
            
            <div class="order-details">
              <h3>Sipariş Bilgileri</h3>
              <p><strong>Sipariş No:</strong> ${_id}</p>
              <p><strong>Sipariş Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
              
              <h4>Teslimat Adresi</h4>
              <p>
                ${shippingAddress.fullName}<br>
                ${shippingAddress.line1}<br>
                ${shippingAddress.city}<br>
                ${shippingAddress.phone}
              </p>
              
              <h4>Sipariş Detayları</h4>
              <table>
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; text-align: left;">Ürün</th>
                    <th style="padding: 10px; text-align: center;">Adet</th>
                    <th style="padding: 10px; text-align: right;">Birim Fiyat</th>
                    <th style="padding: 10px; text-align: right;">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f3f4f6; font-weight: bold;">
                    <td colspan="3" style="padding: 10px; text-align: right;">Genel Toplam:</td>
                    <td style="padding: 10px; text-align: right;" class="total">₺${total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <p>Siparişiniz en kısa sürede hazırlanacak ve size ulaştırılacaktır.</p>
            <p>Teşekkür ederiz!</p>
          </div>
          
          <div class="footer">
            <p>${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'} - Uygun fiyatlı ürünler ve hızlı teslimat</p>
            <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}" <${emailConfig.fromEmail || emailConfig.user}>`,
      to: user.email,
      subject: `Sipariş Onayı - ${_id}`,
      html: html,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Order confirmation email sent to:', user.email);
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      throw error;
    }
  }

  async sendOrderUpdate(order, user, status) {
    let transporter;
    let emailConfig;
    try {
      const result = await this.getTransporter();
      transporter = result.transporter;
      emailConfig = result.config;
    } catch (error) {
      console.error('Email disabled or misconfigured:', error.message);
      return;
    }

    const statusMessages = {
      'processing': 'Siparişiniz işleme alınmıştır.',
      'shipped': 'Siparişiniz kargoya verilmiştir.',
      'delivered': 'Siparişiniz teslim edilmiştir.',
      'cancelled': 'Siparişiniz iptal edilmiştir.',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sipariş Güncellemesi - ${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .status { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}</h1>
            <h2>Sipariş Güncellemesi</h2>
          </div>
          
          <div class="content">
            <p>Merhaba ${user.name || 'Değerli Müşterimiz'},</p>
            
            <div class="status">
              <h3>Sipariş No: ${order._id}</h3>
              <p><strong>Yeni Durum:</strong> ${status}</p>
              <p>${statusMessages[status] || 'Sipariş durumunuz güncellenmiştir.'}</p>
            </div>
            
            <p>Siparişinizi takip etmek için hesabınıza giriş yapabilirsiniz.</p>
          </div>
          
          <div class="footer">
            <p>${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'} - Uygun fiyatlı ürünler ve hızlı teslimat</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}" <${emailConfig.fromEmail || emailConfig.user}>`,
      to: user.email,
      subject: `Sipariş Güncellemesi - ${order._id}`,
      html: html,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Order update email sent to:', user.email);
    } catch (error) {
      console.error('Error sending order update email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    let transporter;
    let emailConfig;
    try {
      const result = await this.getTransporter();
      transporter = result.transporter;
      emailConfig = result.config;
    } catch (error) {
      console.error('Email disabled or misconfigured:', error.message);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hoş Geldiniz - ${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}</h1>
            <h2>Aramıza Hoş Geldiniz</h2>
          </div>
          
          <div class="content">
            <p>Merhaba ${user.name},</p>
            <p>Anadolu Feneri Cam Sanat Merkezi'ne hoş geldiniz! Hesabınız başarıyla oluşturulmuştur.</p>
            <p>Artık uygun fiyatlı ürünlerimizi keşfedebilir ve güvenli alışveriş yapabilirsiniz.</p>
            <p>İyi alışverişler!</p>
          </div>
          
          <div class="footer">
            <p>${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'} - Uygun fiyatlı ürünler ve hızlı teslimat</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}" <${emailConfig.fromEmail || emailConfig.user}>`,
      to: user.email,
      subject: 'Hoş Geldiniz - Anadolu Feneri Cam Sanat Merkezi',
      html: html,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', user.email);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error for welcome email as it's not critical
    }
  }

  async sendMail(options) {
    let transporter;
    let emailConfig;
    try {
      const result = await this.getTransporter();
      transporter = result.transporter;
      emailConfig = result.config;
    } catch (error) {
      console.error('Email disabled or misconfigured:', error.message);
      return;
    }

    const mailOptions = {
      from: options.from || `"${emailConfig.fromName || 'Anadolu Feneri Cam Sanat Merkezi'}" <${emailConfig.fromEmail || emailConfig.user}>`,
      ...options
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();
