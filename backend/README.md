# Anadolu Feneri Cam Sanat Merkezi Backend API

## 🚀 Hızlı Başlangıç

### 1. Kurulum
```bash
cd backend
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

### 3. Veritabanı Kurulumu
```bash
# MongoDB'yi başlatın
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Veritabanını kurun
node setup.js
```

### 4. Sunucuyu Başlatın
```bash
# Development
npm run dev

# Production
npm start
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş
- `GET /api/auth/profile` - Profil bilgisi
- `PUT /api/auth/profile` - Profil güncelle
- `POST /api/auth/forgot-password` - Şifre sıfırlama

### Products
- `GET /api/products` - Ürünleri listele
- `GET /api/products/search` - Ürün ara
- `GET /api/products/:id` - Tek ürün
- `POST /api/products` - Ürün oluştur (Admin)
- `PUT /api/products/:id` - Ürün güncelle (Admin)
- `DELETE /api/products/:id` - Ürün sil (Admin)

### Categories
- `GET /api/categories` - Kategorileri listele
- `GET /api/categories/:id` - Tek kategori
- `POST /api/categories` - Kategori oluştur (Admin)
- `PUT /api/categories/:id` - Kategori güncelle (Admin)
- `DELETE /api/categories/:id` - Kategori sil (Admin)

### Orders
- `GET /api/orders` - Siparişleri listele
- `GET /api/orders/:id` - Tek sipariş
- `POST /api/orders` - Sipariş oluştur
- `PUT /api/orders/:id/status` - Sipariş durumu güncelle (Admin)

### Cart
- `GET /api/cart` - Sepet içeriği
- `POST /api/cart/add` - Sepete ekle
- `PUT /api/cart/update` - Sepet güncelle
- `DELETE /api/cart/remove` - Sepetten çıkar
- `DELETE /api/cart/clear` - Sepeti temizle

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/stats` - Detaylı istatistikler
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/orders` - Sipariş listesi
- `GET /api/admin/ai-dashboard` - AI dashboard

### AI (Admin Only)
- `POST /api/ai/chat` - AI chat
- `POST /api/ai/generate-description` - Açıklama oluştur
- `POST /api/ai/generate-meta-description` - Meta açıklama
- `POST /api/ai/generate-title` - Başlık oluştur
- `POST /api/ai/extract-keywords` - Anahtar kelime çıkar
- `POST /api/ai/generate-tags` - Etiket oluştur
- `POST /api/ai/generate-faq` - FAQ oluştur
- `POST /api/ai/analyze-sentiment` - Duygu analizi
- `POST /api/ai/translate` - Çeviri
- `POST /api/ai/summarize` - Özetleme

## 🔧 Özellikler

- ✅ **JWT Authentication** - Güvenli kimlik doğrulama
- ✅ **Role-based Access** - Admin/Kullanıcı yetkilendirme
- ✅ **Rate Limiting** - API istek sınırlaması
- ✅ **Input Validation** - Veri doğrulama
- ✅ **Error Handling** - Hata yönetimi
- ✅ **AI Integration** - OpenAI/Anthropic entegrasyonu
- ✅ **MongoDB** - NoSQL veritabanı
- ✅ **Pagination** - Sayfalama
- ✅ **Search** - Full-text arama
- ✅ **CORS** - Cross-origin istekler

## 🛠️ Geliştirme

### Scripts
```bash
npm run dev      # Development mode
npm start        # Production mode
npm test         # Testleri çalıştır
npm run lint     # Lint kontrolü
npm run lint:fix # Lint düzeltmeleri
```

### Veritabanı
- **MongoDB** - Ana veritabanı
- **Mongoose** - ODM
- **Indexes** - Performans optimizasyonu

### Güvenlik
- **Helmet** - HTTP header güvenliği
- **CORS** - Cross-origin kaynak paylaşımı
- **Rate Limiting** - İstek sınırlaması
- **JWT** - Token tabanlı kimlik doğrulama
- **bcryptjs** - Şifre hashleme

## 📊 Monitoring

### Health Check
```
GET /health
```

### Logs
- **Morgan** - HTTP request logging
- **Console** - Error logging

## 🚀 Production

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL=mongodb://your-production-db
JWT_SECRET=your-production-secret
OPENAI_API_KEY=your-openai-key
```

### Performance
- **Compression** - Gzip sıkıştırma
- **MongoDB Indexes** - Veritabanı optimizasyonu
- **Rate Limiting** - API koruması

## 📝 API Dokümantasyonu

### Authentication Header
```
Authorization: Bearer <jwt-token>
```

### Response Format
```json
{
  "data": {},
  "message": "Success",
  "error": null
}
```

### Error Format
```json
{
  "error": "Error message",
  "details": []
}
```

## 🔗 Frontend Entegrasyonu

Backend API, frontend ile şu şekilde entegre edilir:

```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// API çağrısı örneği
const response = await fetch(`${API_URL}/api/products`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📞 Destek

Herhangi bir sorun için:
- GitHub Issues
- Email: support@anadolufenericamsanatmerkezi.com
- Dokümantasyon: `/docs` endpoint
