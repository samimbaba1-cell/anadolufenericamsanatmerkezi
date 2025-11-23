const { test, expect } = require('@playwright/test');

test.describe('Ödeme Sayfaları', () => {
  test('ödeme başarı sayfası yükleniyor', async ({ page }) => {
    await page.goto('/payment/success');
    await page.waitForLoadState('networkidle');
    
    // Başarı sayfasının yüklendiğini kontrol et
    await expect(page).toHaveURL(/\/payment\/success/);
    
    // Başarı mesajının görünür olduğunu kontrol et (daha esnek, birden fazla pattern)
    const hasSuccessMessage = await page.getByText(/başarılı|teşekkür|sipariş|alındı|success/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /sipariş|başarı|success/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasSuccessMessage || hasHeading).toBeTruthy();
  });

  test('ödeme hata sayfası yükleniyor', async ({ page }) => {
    await page.goto('/payment/error');
    await page.waitForLoadState('networkidle');
    
    // Hata sayfasının yüklendiğini kontrol et
    await expect(page).toHaveURL(/\/payment\/error/);
    
    // Hata mesajının görünür olduğunu kontrol et (daha esnek, birden fazla pattern)
    const hasErrorMessage = await page.getByText(/hata|başarısız|ödeme|error|failed/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasHeading = await page.getByRole('heading', { name: /hata|error|başarısız/i }).first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(hasErrorMessage || hasHeading).toBeTruthy();
  });
});

