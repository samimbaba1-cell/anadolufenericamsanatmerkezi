# Anadolu Feneri Cam Sanat Merkezi — E-ticaret web sitesi

Türkiye pazarı için hazırlanmış, **mağaza vitrini + sepet + güvenli ödeme** sunan modern bir **e-ticaret web sitesi** projesidir. Ziyaretçiler ürünleri gezer, sepete ekler; **İyzico** altyapısı ile ödeme tamamlanır. İşletme tarafı için **yönetim paneli** üzerinden katalog, sipariş ve site ayarları yönetilir.

> Bu repoda sitenin kaynak kodu yer alır. Canlıda göreceğiniz içerik (ürünler, görseller, metinler) sizin verdiğiniz verilerdir; üretim ortamı için kurulum ayrı yapılır.

---

## Ne sunar?

| Alan | Açıklama |
|------|----------|
| **Ziyaretçi** | Ürün listeleme, arama, kategori ve markalar, ürün detay, sepet, üyelik, profil, sipariş geçmişi |
| **Ödeme** | İyzico entegrasyonu (yönlendirmeli ödeme, sunucu tarafı doğrulama) |
| **Yönetim** | Admin panel: ürün, kategori, marka, banner, kupon, stok, sipariş, müşteriler, içerik ve site ayarları |
| **Operasyon** | E-posta bildirimleri, SEO (meta, sitemap), pazar yeri / feed altyapısı (yapılandırmaya bağlı) |

---

## Öne çıkan işlevler

**Mağaza (ön yüz)**  
Hızlı vitrin, filtreleme, mobil uyumlu sepet ve ödeme adımları. Şifre politikası, oturum yönetimi ve müşteri hesabı.

**Yönetici paneli**  
Tek panelden katalog, kampanya, görsel yüklemeler, sipariş durumları ve genel site ayarları; ihtiyaç halinde pazar yeri entegrasyon bilgileri.

**Güvenlik ve uyumluluk**  
Oran sınırlama, güvenlik HTTP başlıkları, CORS; hassas bilgiler ortam değişkenlerinde tutulur (repoda paylaşılmaz).

---

## Ödeme

Ödemeler **İyzico** üzerinden alınır. Canlıya geçerken Iyzico panelinden üretim API anahtarlarını; sitede ise `FRONTEND_URL`, callback ve site adreslerinin aynı domain stratejisiyle uyumlu olması gerekir. Ayrıntılı kurulum: **[CANLIYA_ALMA.md](./CANLIYA_ALMA.md)**.

---

## Teknoloji (özet)

| Bileşen | Teknoloji |
|---------|-----------|
| Web sitesi | **Next.js** (App Router), React |
| API | **Node.js**, Express |
| Veri | **MySQL**, Sequelize |
| E2E test (geliştirme) | Playwright |

Görsel ve dosya yüklemeleri `backend/uploads/` altında tutulur; yedekleme üretimde sizin sorumluluğunuzdadır.

---

## Geliştirme ortamında çalıştırma

**Gereksinimler:** Node.js 18+, MySQL 8, npm.

```bash
git clone <repo-adresi>
cd "Anadolu Feneri Cam sanat Merkezi"
npm run install-all
```

**Ortam dosyaları** — `backend/env.example` → `backend/.env`, `frontend/env.example` → `frontend/.env.local` (Windows’ta `copy`, Linux/macOS’ta `cp` kullanabilirsiniz).

Geliştirirken tipik adresler: `FRONTEND_URL=http://localhost:3001`, `NEXT_PUBLIC_API_URL=http://localhost:3000` (yalnızca origin, sonunda `/api` yok).

Veritabanını oluşturup bağlantı bilgilerini `.env`e yazın. İlk şema ve (geliştirmede) deneme verisi için `backend/setup.js` ve detaylar için **`backend/README.md`**.

**İki terminal:**

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

- Site: [http://localhost:3001](http://localhost:3001)  
- Yönetim: [http://localhost:3001/admin](http://localhost:3001/admin)  
- API sağlık: [http://localhost:3000/health](http://localhost:3000/health)

Kök dizinde `npm run dev` ile her iki proses birden açılabilir. Üretim derlemesi: kökte `npm run build` veya `frontend` içinde `npm run build` + `npm start`.

---

## Canlıya alma (üretim)

Sunucu seçimi, Nginx, SSL, PM2, ortam değişkenleri ve **demosuz** ilk kurulum tek dosyada anlatılır:

**[CANLIYA_ALMA.md](./CANLIYA_ALMA.md)**

---

## Test ve kod kalitesi

- `backend/`: `npm run lint`  
- `frontend/`: `npm run lint` — E2E: `npm run test:e2e` (Playwright)  

`npm run seed` yalnızca geliştirme / test verisi içindir; canlı veritabanında kullanılmaz (teknik olarak engellenir). Ayrıntı `CANLIYA_ALMA.md` ve `backend/README.md` içinde.

---

## Lisans

MIT — ayrıntı `package.json` dosyasındadır.
