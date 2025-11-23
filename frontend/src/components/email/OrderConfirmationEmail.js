export default function OrderConfirmationEmail({ order, customer }) {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sipariş Onayı - Anadolu Feneri Cam Sanat Merkezi</title>
      <style>
        body {
          font-family: 'Inter', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          padding: 30px;
        }
        .order-info {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .order-item:last-child {
          border-bottom: none;
        }
        .total {
          font-weight: bold;
          font-size: 18px;
          color: #3b82f6;
        }
        .button {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Anadolu Feneri Cam Sanat Merkezi</div>
          <h1>Siparişiniz Onaylandı!</h1>
          <p>Sipariş numaranız: <strong>#${order.orderNumber}</strong></p>
        </div>
        
        <div class="content">
          <p>Merhaba ${customer.firstName},</p>
          <p>Siparişiniz başarıyla alınmış ve onaylanmıştır. Siparişiniz en kısa sürede hazırlanacak ve kargoya verilecektir.</p>
          
          <div class="order-info">
            <h3>Sipariş Detayları</h3>
            ${order.items.map(item => `
              <div class="order-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>₺${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="order-item">
              <span>Kargo</span>
              <span>${order.shipping === 0 ? 'Ücretsiz' : `₺${order.shipping.toFixed(2)}`}</span>
            </div>
            <div class="order-item total">
              <span>Toplam</span>
              <span>₺${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <h3>Teslimat Adresi</h3>
          <p>
            ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
            ${order.shippingAddress.address}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
          </p>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${order._id}" class="button">
            Siparişi Takip Et
          </a>
        </div>
        
        <div class="footer">
          <p>Teşekkürler, Anadolu Feneri Cam Sanat Merkezi Ekibi</p>
          <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
