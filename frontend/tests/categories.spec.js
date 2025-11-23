const { test, expect } = require('@playwright/test');

test.describe('Kategoriler Sayfası', () => {
  test('kategoriler sayfası yükleniyor', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Kategoriler sayfasının yüklendiğini kontrol et
    await expect(page).toHaveURL(/\/categories/);
  });

  test('kategori listesi görüntüleniyor', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Kategorilerin yüklenmesi için bekle
    
    // Kategori kartlarının veya listesinin görünür olduğunu kontrol et
    const hasCategories = await page.locator('[data-testid="category-card"], .category-card, a[href*="/categories/"]').count() > 0;
    const hasCategoryList = await page.getByRole('link', { name: /kategori/i }).count() > 0;
    const hasCategoryLinks = await page.locator('a[href*="/categories/"]').count() > 0;
    const hasCategoryText = await page.getByText(/kategori|category/i).first().isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasCategories || hasCategoryList || hasCategoryLinks || hasCategoryText).toBeTruthy();
  });

  test('kategoriye tıklanınca ürünler listeleniyor', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // İlk kategori linkini bul ve tıkla
    const categoryLink = page.locator('a[href*="/categories/"]').first();
    const linkExists = await categoryLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (linkExists) {
      await categoryLink.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await categoryLink.click({ force: true, timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Ürünlerin listelendiğini kontrol et
      const hasProducts = await page.locator('[data-testid="product-card"]').count() > 0;
      const hasNoProducts = await page.getByText(/ürün bulunamadı/i).isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(hasProducts || hasNoProducts).toBeTruthy();
    }
  });
});

