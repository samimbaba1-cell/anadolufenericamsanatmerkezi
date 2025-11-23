const { test, expect } = require('@playwright/test');

test.describe('Arama Sayfası', () => {
  test('arama sayfası yükleniyor', async ({ page }) => {
    await page.goto('/search?q=test');
    await page.waitForLoadState('networkidle');
    
    // Arama sayfasının yüklendiğini kontrol et
    await expect(page).toHaveURL(/\/search/);
  });

  test('arama sonuçları görüntüleniyor', async ({ page }) => {
    await page.goto('/search?q=test');
    await page.waitForLoadState('networkidle');
    
    // Arama sonuçlarının görünür olduğunu kontrol et (ürün kartları veya "sonuç bulunamadı" mesajı)
    await page.waitForTimeout(2000); // Arama sonuçlarının yüklenmesini bekle
    const hasResults = await page.locator('[data-testid="product-card"]').count() > 0;
    const hasNoResults = await page.getByText(/sonuç bulunamadı|ürün bulunamadı|no results|no products/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasSearchHeading = await page.getByRole('heading', { name: /arama|search|sonuç/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    
    expect(hasResults || hasNoResults || hasSearchHeading).toBeTruthy();
  });

  test('arama kutusu çalışıyor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Arama kutusunu bul
    const searchInput = page.getByPlaceholder(/Ara|ara/i).first();
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill('test ürün');
    await searchInput.press('Enter');
    
    // Arama sayfasına yönlendirildiğini kontrol et
    await expect(page).toHaveURL(/\/search/, { timeout: 10000 });
  });
});

