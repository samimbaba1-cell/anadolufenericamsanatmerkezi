const { test, expect } = require('@playwright/test');

test.describe('Statik Sayfalar', () => {
  test('hakkımızda sayfası yükleniyor', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Hakkımızda sayfasının yüklendiğini kontrol et (daha esnek)
    const hasAboutContent = await page.getByText(/Hakkımızda|About|hakkında/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /Hakkımızda|About/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasAboutContent || hasHeading).toBeTruthy();
  });

  test('gizlilik politikası sayfası yükleniyor', async ({ page }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');
    
    // Gizlilik politikası sayfasının yüklendiğini kontrol et (daha esnek)
    const hasPrivacyContent = await page.getByText(/Gizlilik|Privacy|politika/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /Gizlilik|Privacy/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasPrivacyContent || hasHeading).toBeTruthy();
  });

  test('kullanım şartları sayfası yükleniyor', async ({ page }) => {
    await page.goto('/terms-of-use');
    await page.waitForLoadState('networkidle');
    
    // Kullanım şartları sayfasının yüklendiğini kontrol et (daha esnek)
    const hasTermsContent = await page.getByText(/Kullanım|Terms|şartları/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /Kullanım|Terms/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasTermsContent || hasHeading).toBeTruthy();
  });

  test('iade ve değişim sayfası yükleniyor', async ({ page }) => {
    await page.goto('/returns');
    await page.waitForLoadState('networkidle');
    
    // İade sayfasının yüklendiğini kontrol et (daha esnek)
    const hasReturnsContent = await page.getByText(/İade|Returns|değişim/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /İade|Returns/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasReturnsContent || hasHeading).toBeTruthy();
  });

  test('iletişim sayfası yükleniyor', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    // İletişim sayfasının yüklendiğini kontrol et (daha esnek)
    const hasContactContent = await page.getByText(/İletişim|Contact/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /İletişim|Contact/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasContactContent || hasHeading).toBeTruthy();
  });

  test('cookie politikası sayfası yükleniyor', async ({ page }) => {
    await page.goto('/cookie-policy');
    await page.waitForLoadState('networkidle');
    
    // Cookie politikası sayfasının yüklendiğini kontrol et (daha esnek)
    const hasCookieContent = await page.getByText(/Cookie|çerez/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /Cookie|çerez/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasCookieContent || hasHeading).toBeTruthy();
  });

  test('SSS sayfası yükleniyor', async ({ page }) => {
    await page.goto('/faq', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // SSS sayfasının yüklendiğini kontrol et (daha esnek)
    const hasFaqContent = await page.getByText(/SSS|FAQ|Sıkça|soru/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /SSS|FAQ|Sıkça/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasFaqContent || hasHeading).toBeTruthy();
  });
});

