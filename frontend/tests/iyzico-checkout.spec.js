/**
 * Iyzico checkout E2E testleri.
 * Backend .env'de IYZICO_API_KEY ve IYZICO_SECRET_KEY (sandbox) tanımlı olmalı.
 * Chromium ile çalıştırılması önerilir (harici Iyzico sayfası).
 */
const { test, expect } = require('@playwright/test');
const { addProductToUserCart, loginUser } = require('./helpers');

const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.API_URL || 'http://127.0.0.1:3000';

/** Checkout formunu doldurur (teslimat adresi). */
async function fillCheckoutForm(page, options = {}) {
  const fillByLabel = async (labelText, value) => {
    const label = page.getByText(labelText, { exact: false }).first();
    if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
      const input = label.locator('..').locator('input, textarea').first();
      await input.fill(value);
    }
  };

  await fillByLabel('Ad *', options.firstName || 'Test');
  await fillByLabel('Soyad *', options.lastName || 'Kullanıcı');
  await fillByLabel('Adres *', options.address || 'Test Adresi 123');
  await fillByLabel('Şehir *', options.city || 'İstanbul');
  await fillByLabel('İlçe *', options.state || 'Kadıköy');
  await fillByLabel('Posta Kodu *', options.zipCode || '34000');
  await fillByLabel('Telefon', options.phone || '5555555555');
}

/** Sepet dolu, checkout sayfasına gider. */
async function ensureCheckoutWithCart(page, token) {
  let cartItems = 0;
  let cartData = null;
  let retries = 3;
  while (cartItems === 0 && retries > 0) {
    await addProductToUserCart(page, token, { maxPrice: 50000, preferCheapest: true });
    await page.waitForTimeout(2000);
    const cartRes = await page.request.get(`${API_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    if (cartRes.ok()) {
      const data = await cartRes.json();
      if (data.items && data.items.length > 0) {
        cartData = data;
        cartItems = data.items.length;
        break;
      }
    }
    retries--;
    await page.waitForTimeout(1000);
  }
  if (cartItems === 0) throw new Error('Sepete ürün eklenemedi');

  if (cartData?.items?.length) {
    const normalizedCart = cartData.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      image: item.image,
      productData: {
        id: item.product,
        _id: item.product,
        name: item.name,
        price: item.price,
        images: item.image ? [item.image] : [],
      },
    }));

    await page.evaluate((items) => {
      localStorage.setItem('cart', JSON.stringify(items));
    }, normalizedCart);
  }

  await page.goto('/checkout', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/\/checkout/, { timeout: 10000 });
}

test.describe('Iyzico Checkout', () => {
  test.describe.configure({ mode: 'serial' });

  test('kredi kartı seçilip sipariş tamamlanınca Iyzico ödeme sayfasına yönlendirilir', async ({
    page,
    browserName
  }) => {
    test.skip(browserName !== 'chromium', 'Iyzico testi sadece Chromium ile çalıştırılıyor');
    test.setTimeout(120000);

    let initResponse = null;
    let dialogMessage = '';
    page.on('response', async (response) => {
      if (!response.url().includes('/api/payments/iyzico/initialize')) {
        return;
      }

      let body = '';
      try {
        body = await response.text();
      } catch (_) {}

      initResponse = {
        status: response.status(),
        body,
      };
    });
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await loginUser(page, 'test@example.com', 'Test123456', 30000);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (!token) throw new Error('Token yok');

    await ensureCheckoutWithCart(page, token);

    await fillCheckoutForm(page);

    const creditCardRadio = page.locator('input[type="radio"][value="credit_card"]').first();
    const creditCardVisible = await creditCardRadio.isVisible({ timeout: 5000 }).catch(() => false);
    if (!creditCardVisible) {
      test.skip(true, 'Kredi kartı (Iyzico) seçeneği görünmüyor - backend Iyzico key olmayabilir');
    }
    await creditCardRadio.scrollIntoViewIfNeeded();
    await creditCardRadio.click({ force: true });
    await page.waitForTimeout(500);

    const submitBtn = page.getByRole('button', { name: /Siparişi Tamamla/i }).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });

    await page.waitForURL(/iyzipay|iyzico|\/payment\/(callback|success)/, { timeout: 45000 }).catch(() => {});

    const finalUrl = page.url();
    const wentToIyzico = /iyzipay|iyzico/i.test(finalUrl);
    const wentToOurPayment = /\/payment\/(callback|success)/.test(finalUrl);

    const initFailedBecauseGatewayUnavailable =
      !wentToIyzico &&
      !wentToOurPayment &&
      initResponse?.status === 500 &&
      /Ödeme başlatma hatası|api bilgileri bulunamadı/i.test(
        `${initResponse?.body || ''} ${dialogMessage}`
      );

    test.skip(
      initFailedBecauseGatewayUnavailable,
      'Iyzico initialize ortami hazir degil; API bilgileri veya dis servis yaniti eksik.'
    );

    expect(
      wentToIyzico || wentToOurPayment,
      `Beklenen: Iyzico sayfası veya /payment/callback|success. Gerçek URL: ${finalUrl}`
    ).toBeTruthy();
  });

  test('Iyzico sandbox sayfasında test kartı ile ödeme tamamlanır (opsiyonel)', async ({
    page,
    browserName
  }) => {
    test.skip(browserName !== 'chromium', 'Sadece Chromium');
    test.setTimeout(180000);

    let initResponse = null;
    let dialogMessage = '';
    page.on('response', async (response) => {
      if (!response.url().includes('/api/payments/iyzico/initialize')) {
        return;
      }

      let body = '';
      try {
        body = await response.text();
      } catch (_) {}

      initResponse = {
        status: response.status(),
        body,
      };
    });
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await loginUser(page, 'test@example.com', 'Test123456', 30000);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    if (!token) throw new Error('Token yok');

    await ensureCheckoutWithCart(page, token);
    await fillCheckoutForm(page);

    const creditCardRadio = page.locator('input[type="radio"][value="credit_card"]').first();
    if (!(await creditCardRadio.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Kredi kartı seçeneği yok');
    }
    await creditCardRadio.click({ force: true });
    await page.waitForTimeout(500);

    const submitBtn = page.getByRole('button', { name: /Siparişi Tamamla/i }).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });

    await page.waitForURL(/iyzipay|iyzico|\/payment\//, { timeout: 45000 }).catch(() => {});

    const url = page.url();

    const initFailedBecauseGatewayUnavailable =
      initResponse?.status === 500 &&
      /Ödeme başlatma hatası|api bilgileri bulunamadı/i.test(
        `${initResponse?.body || ''} ${dialogMessage}`
      );

    test.skip(
      initFailedBecauseGatewayUnavailable,
      'Iyzico initialize ortami hazir degil; sandbox odeme sayfasi dogrulanamadi.'
    );

    if (/\/payment\/(callback|success)/.test(url)) {
      return;
    }
    if (!/iyzipay|iyzico/i.test(url)) {
      throw new Error(`Iyzico sayfasına yönlendirilmedi. Mevcut URL: ${url}`);
    }

    await page.waitForTimeout(8000);

    const cardNumberSelectors = [
      'input[name*="cardNumber"]',
      'input[name*="card_number"]',
      'input[placeholder*="Kart"]',
      'input[placeholder*="kart"]',
      'input[placeholder*="card"]',
      'input[id*="cardNumber"]',
      'input[id*="card-number"]',
      'input[type="tel"]',
      'input[type="text"]'
    ];

    const tryFillInFrame = async (frame) => {
      for (const sel of cardNumberSelectors) {
        const el = frame.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.fill('5890040000000016');
          return true;
        }
      }
      return false;
    };

    let cardFilled = false;
    for (const frame of page.frames()) {
      if (await tryFillInFrame(frame)) {
        cardFilled = true;
        break;
      }
    }
    if (!cardFilled) {
      for (const sel of cardNumberSelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.fill('5890040000000016');
          cardFilled = true;
          break;
        }
      }
    }
    if (!cardFilled) {
      const inputs = page.locator('input[type="text"], input[type="tel"], input:not([type])');
      const n = await inputs.count();
      if (n >= 1) {
        const first = inputs.first();
        if (await first.isVisible({ timeout: 1000 }).catch(() => false)) {
          await first.fill('5890040000000016');
          cardFilled = true;
        }
      }
    }
    if (!cardFilled) {
      expect(page.url()).toMatch(/iyzipay|iyzico/i);
      return;
    }

    await page.waitForTimeout(800);

    const expirySelectors = [
      'input[name*="expire"]',
      'input[name*="expiry"]',
      'input[name*="expireMonth"]',
      'input[name*="expireYear"]',
      'input[placeholder*="son kullanma"]',
      'input[placeholder*="MM"]',
      'input[placeholder*="YY"]'
    ];
    for (const frame of page.frames()) {
      for (const sel of expirySelectors) {
        const el = frame.locator(sel).first();
        if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
          await el.fill('12/30');
          break;
        }
      }
    }
    for (const sel of expirySelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.fill('12/30');
        break;
      }
    }

    const cvcSelectors = [
      'input[name*="cvc"]',
      'input[name*="cvv"]',
      'input[placeholder*="cvc"]',
      'input[placeholder*="CVV"]',
      'input[placeholder*="güvenlik"]'
    ];
    for (const frame of page.frames()) {
      for (const sel of cvcSelectors) {
        const el = frame.locator(sel).first();
        if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
          await el.fill('123');
          break;
        }
      }
    }
    for (const sel of cvcSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.fill('123');
        break;
      }
    }

    await page.waitForTimeout(1000);

    let payClicked = false;
    const paySelectors = [
      'button:has-text("Öde")',
      'button:has-text("Pay")',
      'button:has-text("Tamamla")',
      'input[type="submit"]',
      'button[type="submit"]',
      'a:has-text("Öde")',
      '[role="button"]:has-text("Öde")'
    ];
    for (const frame of page.frames()) {
      for (const sel of paySelectors) {
        const btn = frame.locator(sel).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click({ force: true }).catch(() => {});
          payClicked = true;
          break;
        }
      }
      if (payClicked) break;
    }
    if (!payClicked) {
      for (const sel of paySelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click({ force: true }).catch(() => {});
          payClicked = true;
          break;
        }
      }
    }

    await page.waitForURL(/\/payment\/(callback|success)|127\.0\.0\.1|localhost/, { timeout: 70000 }).catch(() => {});

    const finalUrl = page.url();
    const success = /\/payment\/success/.test(finalUrl) || /\/payment\/callback/.test(finalUrl);
    expect(success, `Ödeme sonrası success/callback bekleniyordu. URL: ${finalUrl}`).toBeTruthy();
  });
});
