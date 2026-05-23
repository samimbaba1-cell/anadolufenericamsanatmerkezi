# Canlıya alma — Natro / Linux VPS (tek rehber)

Bu dosya repodaki **asıl canlı dağıtım kaynağıdır**. Amaç: sunucuda **demo ve test artığı olmadan** yalnızca gerekli kodu ve ortam değişkenlerini çalıştırmak.

---

## Sunucuya bağlanma (SSH) — hızlı referans

| Bilgi | Değer |
|--------|--------|
| **IP** | `94.73.180.155` |
| **Kullanıcı** | `root` |
| **İşletim sistemi** | Ubuntu 20.04 (hostname: `ns1`) |
| **Site (canlı)** | https://anadolufenericamsanatmerkezi.com |
| **Proje klasörü** | `/var/www/afcsm` |
| **Backend** | `/var/www/afcsm/backend` (port **3000**) |
| **Frontend** | `/var/www/afcsm/frontend` (port **3001**) |
| **Nginx site config** | `/etc/nginx/sites-available/anadolufenericamsanatmerkezi.com` |

### Windows’tan giriş

1. **CMD** veya **PowerShell** aç.
2. Şunu yaz (Enter’a bas, şifre sorulunca Natro VPS root şifreni gir):

```bash
ssh root@94.73.180.155
```

3. Bağlandıktan sonra örnek komutlar:

```bash
# Proje klasörü
cd /var/www/afcsm

# PM2 (backend + frontend)
pm2 status
pm2 logs afcsm-backend --lines 50
pm2 logs afcsm-frontend --lines 50
pm2 restart afcsm-backend --update-env
pm2 restart afcsm-frontend

# Sağlık kontrolü
curl -sS http://127.0.0.1:3000/health
curl -sI http://127.0.0.1:3001 | head -n 1

# Kod güncelle + frontend build
cd /var/www/afcsm && git pull
cd frontend && NODE_OPTIONS=--max-old-space-size=1536 npm run build
pm2 restart afcsm-frontend

# Nginx
nginx -t && systemctl reload nginx

# Backend .env düzenle
nano /var/www/afcsm/backend/.env

# Kategori slug'larını isimden düzelt (token gerekmez, bir kerelik)
cd /var/www/afcsm/backend && node scripts/fix-category-slugs.js
```

### Bağlantı koparsa

`client_loop: send disconnect: Connection reset` görürsen tekrar `ssh root@94.73.180.155` yazman yeterli. PM2 süreçleri sunucuda çalışmaya devam eder.

### Şifre / güvenlik

- Root şifresi **Natro VPS panelinden**; bu dosyaya yazma.
- İlk girişte “Are you sure…?” derse `yes` yaz.
- İleride istersen SSH anahtarı (key) ile şifresiz giriş kurulabilir.

---

## 1) Sunucuya ne gider, ne gitmez?

### Alınacaklar (kaynak)

| Ne | Açıklama |
|----|----------|
| `backend/` | API. `node_modules` sunucuda `npm ci --omit=dev` ile üretilir. |
| `frontend/` | Next.js. `node_modules` ve `.next` sunucuda kurulur/üretilir. |
| `package.json` (kök) | İsteğe bağlı; kök `npm` script’leri için. |
| `docker-compose.yml` | Sadece Docker ile çalışacaksanız. |

`backend/uploads/`: canlıda **dizin olmalı** (yazma izni). Mevcut ürün görsellerinizi **üzerine yazmadan** taşıyın; boş kurulumda boş klasör yeterlidir.

### Asla repodan kopyalanmaması veya canlıda kullanılmaması gerekenler

- **`backend/.env`**, **`frontend/.env.production`**, tüm gizli anahtarlar — sunucuda **elle** oluşturun, repoya koymayın.
- **`node_modules/`** — taşımayın; sunucuda `npm install` / `npm ci`.
- **`frontend/.next/`** — taşımayın; sunucuda `npm run build`.
- **`npm run seed`** / **`node backend/scripts/seedData.js`** — **sadece geliştirme ve Playwright E2E**. `NODE_ENV=production` iken **çalışmaz**; canlı veritabanına demo ürün basmaz, basamaz.
- **Playwright** (`frontend/tests/`, `playwright.config.js`, e2e sonuç klasörleri) — canlı sunucuya yüklemek zorunlu değil; isterseniz hariç bırakın.
- Geliştirme yardımcı script’ler (`*test*`, `perf-api.js` vb.) — production zorunluluğu değil.

### Kod taşıma şekli

- **Önerilen:** sunucuda `git clone` + `git pull` (deploy branch).
- **Alternatif:** zip/rsync; yukarıdaki “taşıma” listesine uyun, `node_modules` ve `.next` hariç.

---

## 2) Kısa kurulum sırası

1. **MySQL** veritabanı + kullanıcı (hosting paneli veya sunucuda manuel). Host çoğunlukla `localhost` veya sağlayıcının verdiği adres; bazı panellerde veritabanı ve kullanıcı adına **prefix** eklenir — tam isimleri `backend/.env` içine yazın. İsterseniz manuel SQL:  
   `CREATE DATABASE ...;` + kullanıcı + `GRANT ALL PRIVILEGES ...`  
   **Natro / panel “uzak MySQL izinli IP”:** DBeaver vb. ile **dışarıdan** DB’ye bağlanacaksanız kendi çıkış IP’nizi ekleyin. `94.73.180.155/32` gibi ifadelerde **`/32`** = yalnızca o tek adres. Uygulama sunucuda `DB_HOST=localhost` ise bu liste uygulama için zorunlu değildir. **Bölüm 3’teki A/B** (`setup.js` / `create-admin.js`) bu IP ile ilgili değildir; A = ilk şema+admin, B = yalnızca admin kullanıcısı.
2. Sunucu: **Node.js 18+**, tercihen **Nginx**, **PM2** (veya systemd), **SSL (Let’s Encrypt)**.
3. **`backend/.env`**: `env.example` şablonundan; `NODE_ENV=production`, güçlü `JWT_SECRET` ve `SETTINGS_SECRET_KEY`, `DATABASE_URL` veya `DB_*`, `FRONTEND_URL`, `IYZICO_*` (gerçek ödeme için **production Iyzico URL**), e-posta için `SMTP_*`.
4. **`frontend/.env.production`**: `frontend/.env.production.example` şablonundan.  
   - `NEXT_PUBLIC_API_URL` = **yalnızca origin** (sonunda `/api` yok).  
   - **Aynı domain + Nginx:** Tarayıcı `https://siteniz.com/api/...` ve `https://siteniz.com/uploads/...` kullanacaksa kök adresi yazın: `https://siteniz.com` — **asla** `http://127.0.0.1:3000` yazmayın (tarayıcıda çalışmaz). Şablon boş bırakılabilir; o zaman istemci aynı origin’e gider (Nginx’in `/api` ve `/uploads` proxy’si şart).  
   - **Ayrı API subdomain:** `https://api.siteniz.com` gibi; bu durumda CORS ve Iyzico yönlendirme adreslerini buna göre ayarlayın.
5. Backend: `cd backend` → `npm install` (veya `npm ci --omit=dev`) + (ilk kurulum) şema ve **admin** — bölüm 3. Çalıştırma: `npm start`
6. Frontend: `cd frontend` → `npm install` → `npm run build` → `npm start` (port 3001).
7. **Nginx** reverse proxy: site → `127.0.0.1:3001`; **API** için `location /api/` → `127.0.0.1:3000`; **medya/banner** için `location /uploads/` → aynı backend (`127.0.0.1:3000`). Repo kökündeki `nginx.conf` Docker örneğinde bu üçü birlikte tanımlıdır — Natro/VPS’te tek dosyaya taşırken `/uploads/` bloğunu **silme**yın. Ardından **HTTPS**.
8. **PM2** ile süreçleri kalıcı tutma (örnek; yolları kendi sunucunuza göre değiştirin):  
   `pm2 start npm --name afcsm-backend -- start --cwd /path/to/backend`  
   `pm2 start npm --name afcsm-frontend -- start --cwd /path/to/frontend`  
   `pm2 save`
9. Duman testi: `GET /health`, giriş, admin, ürün, sepet, ödeme, Iyzico dönüşü, e-posta (SMTP) — bölüm 2a.

### 2a) Canlı açılmadan hızlı kontrol

- `GET /health` (backend)
- Tarayıcıda doğrudan: `https://siteniz.com/uploads/` altında bilinen bir dosya yolu **200** dönüyor mu (banner/ürün görseli; 404 ise Nginx `/uploads` proxy eksik veya `backend/uploads` boş).
- Kayıt / giriş, ürün listesi ve detay, sepet, checkout
- Yönetici girişi, İyzico yönlendirmesi, callback sonrası sipariş durumu
- SMTP ile şifre sıfırlama veya test postası (yapılandırdıysanız)

Geliştiriciler: tam E2E yalnızca lokal/CI’da; canlıda `PLAYWRIGHT_BASE_URL=https://siteniz.com` ile sınırlı duman testi isteğe bağlı (repo içi Playwright, sunucuda çalıştırmak zorunlu değil).

---

## 3) İlk veritabanı ve admin (demo yok)

**Hedef:** Tablolar oluşsun, **tek admin** (veya sizin tanımladığınız) kullanıcı olsun; **iPhone/Samsung gibi demo ürün yok** (`setup.js` production’da kategori/ürün oluşturmaz).

### A) `setup.js` (şema + admin, demolar yok)

İlk sefer, production’da bir kerelik:

```bash
cd backend
export NODE_ENV=production
export ALLOW_PRODUCTION_SETUP=true
export ALLOW_SCHEMA_SYNC=true
export SETUP_ADMIN_PASSWORD="güçlü_bir_şifre"
# .env yüklenir; aynı değerleri .env içinde de tutabilirsiniz
node setup.js
```

- `setup.js` **production** modunda yalnızca **veritabanı senkronizasyonu** + **admin** üretir; **demo kategori/ürün eklemez**.
- Lokalde demo isterseniz: `NODE_ENV=development` veya `SKIP_DEMO_DATA` kullanmayın. Demoyu lokalde de kapatmak için: `SKIP_DEMO_DATA=true`.

### B) Sadece admin (şema zaten varsa)

```bash
cd backend
export NODE_ENV=production
export ADMIN_EMAIL=admin@domaininiz.com
export ADMIN_PASSWORD="güçlü_bir_şifre"
node create-admin.js
```

Admin varsa script çıkış verir; mevcut admini silmez.

### C) Eski E2E deneme kayıtları (test DB’den kopya migration)

Yerel/test ortamındaki `Test Ürün %`, `test+...@example.com` gibi artıklar için (isteğe bağlı):

```bash
cd backend
npm run cleanup:playwright
# Production DB'de: ALLOW_PLAYWRIGHT_CLEANUP=true gerekir (script içi güvenlik)
```

---

## 4) İçerik (ürün, kategori, görseller)

- Canlıdaki tüm katalog **admin panelden** veya sizin içe aktarma sürecinizle doldurulur.
- **`seedData.js` ve `npm run seed`**: yalnızca **development / Playwright**; canlıda çalıştırılmaz.

---

## 5) Ödeme ve site adresleri (özet)

- Iyzico: canlıda `IYZICO_BASE_URL` genelde `https://api.iyzipay.com` (Iyzico dokümantasyonuna göre).
- `FRONTEND_URL` ve Iyzico callback/redirect URL’leri, **gerçek domain** ile aynı olmalı.
- Admin paneldeki (veya `settings`) ödeme anahtarları, `.env` ile uyumlu olsun.

---

## 6) Ubuntu + Docker (isteğe bağlı tek sunucu)

Bu repo kökünde **`docker-compose.yml`** ile MySQL, backend, frontend ve isteğe bağlı **nginx** aynı makinede kalkar.

1. Sunucuda **Docker** ve **Docker Compose plugin** kurulu olsun.
2. Repoyu klonlayın; kök dizinde **`.env.docker.example`** dosyasını **`.env.docker`** olarak kopyalayıp gerçek şifreleri ve domaine uygun `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` değerlerini yazın. (Nginx üzerinden tek domain kullanıyorsanız API adresi de o origin olmalıdır.)
3. İlk kurulum / güncelleme için **`scripts/deploy-production-docker.sh`** çalıştırılabilir (Linux/bash). Varsayılan ortam dosyası `.env.docker`; farklı dosya için `ENV_FILE=/path/.env` kullanın.
4. Compose, **`docker-compose.prod.yml`** ile birlikte kullanıldığında MySQL’in **3306** portu dışarı publish edilmez (yalnızca iç ağ). Komut örneği script içindedir.
5. Veritabanı şeması ve admin için bölüm **3**’teki `setup.js` veya `create-admin.js` adımlarını **konteyner içinde** veya hosttan, aynı `DATABASE_URL` / `DB_*` ile bir kez uygulayın.
6. **`nginx.conf`**: `server_name` ve SSL bloklarını kendi domain sertifikanıza göre düzenleyin; büyük medya yükleri için `client_max_body_size` ayarı kök `nginx.conf` içindedir.

PM2 + ayrı Node süreçleri yerine tamamen Docker kullanacaksanız yukarıdaki sıra yeterlidir; hibrit kurulumda (hostta Nginx, yalnızca DB Docker vb.) bölüm **2**’deki klasik yol geçerlidir.

---

## 7) Natro XCloud VPS (Ubuntu 20.04 — paneldeki sunucu)

**xcloud118562** gibi bir makine = tam Linux VPS. Natro panelden **Konsol** veya `ssh kullanici@SUNUCU_PUBLIC_IP` ile girersin. Canlı kurulum **ya bölüm 2** (Nginx + PM2 + MySQL bu VPS’te) **ya bölüm 6** (Docker hepsi bu VPS’te); ikisini aynı anda zorunlu tutma.

| Adım | Ne |
|------|-----|
| DNS | Alan adının **A** kaydı bu sunucunun **public IP**’sine. |
| RAM (2 GB) | `frontend` için `npm run build` takılırsa **swap** aç veya build’i başka makinede alıp `.next` taşı; veya `NODE_OPTIONS=--max-old-space-size=1536 npm run build`. |
| Yazılım | Node **18+**, `nginx`, `certbot` (SSL), MySQL: `apt` ile bu sunucuda **veya** Natro’nun verdiği harici MySQL — o zaman `backend/.env` içinde `DB_HOST` paneldeki host. |
| Kod | Örn. `/var/www/afcsm` altına `git clone` / `git pull`. |
| Gizli dosya | Sunucuda oluştur: `backend/.env`, `frontend/.env.production` (repoda yok). |
| Veritabanı | Bölüm **3**: ilk kez **A** (`setup.js`), tablolar hazırsa **B** (`create-admin.js`). **Seed yok.** |
| Çalıştır | Backend `npm ci --omit=dev` → `npm start`; frontend `npm ci` → `npm run build` → `npm start`; kalıcı için **PM2** (bölüm 2 adım 8). |
| Nginx | Site → `127.0.0.1:3001`; **`/api/`** ve **`/uploads/`** → `127.0.0.1:3000` (bölüm 2 adım 7). SSL aç. |

**`NEXT_PUBLIC_*`:** Tek domain + Nginx proxy ise `NEXT_PUBLIC_API_URL=https://alanadin.com` veya boş + Nginx’in `/api` ve `/uploads` proxy’si (bölüm 2 adım 4).

---

**Özet:** Sunucuya `backend` + `frontend` kaynağını alın, ortam dosyalarını sunucuda üretin, `setup.js` veya `create-admin` ile **demosuz** ayağa kalkın, içeriği admin panelden verin. Demo/test script’lerini canlıda çalıştırmayın. **Natro XCloud VPS** için adım özeti: **bölüm 7**. Kök dizindeki `README.md` lokal geliştirme için kısa özet sunar.
