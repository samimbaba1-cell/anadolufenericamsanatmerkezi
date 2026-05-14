# Anadolu Feneri Cam Sanat Merkezi Backend API

Bu servis Express + Sequelize + MySQL ile calisir.

## Hızlı Başlangıç

```bash
cd backend
npm install
cp env.example .env
```

Gerekli temel degiskenler:

- `DATABASE_URL` veya `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
- `JWT_SECRET`
- `SETTINGS_SECRET_KEY`
- `FRONTEND_URL`
- `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`

Calistirma:

```bash
# Development
npm run dev

# Production
npm start
```

Varsayilan port: `3000`

Health check:

```text
GET /health
```

## Veritabani

- Veritabani: `MySQL`
- ORM: `Sequelize`
- Modeller: `backend/src/models`

Production'da `sequelize.sync` veya `setup.js` ile rastgele sema degisikligi yapmayin. Lokal kurulum ve kontrollu bootstrap disinda `setup.js` kullanimi onerilmez.

## Scriptler

```bash
npm run dev
npm start
npm run lint
npm run seed
npm run promote:admin user@example.com
npm run verify:feeds
npm run verify:webhooks
```

Guvenlik notlari:

- `seedData.js` sadece dev/Playwright; production'da cagrildiginda hata verir.
- `setup.js` production ortaminda ancak acik izin degiskenleri ile calisir.
- `create-admin.js` production ortaminda `ADMIN_PASSWORD` olmadan admin olusturmaz.
- Webhook endpoint'lerinde production secret'lari zorunludur.

## Frontend entegrasyonu

Frontend origin'i backend tarafinda `FRONTEND_URL` ile tanimlanir. Frontend tarafindaki `NEXT_PUBLIC_API_URL` yalnizca origin olmali; sonuna `/api` eklenmemelidir.

## Production notlari

Canliya alma adimlari: **`../CANLIYA_ALMA.md`**
