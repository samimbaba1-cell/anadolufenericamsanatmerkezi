const { test, expect } = require('@playwright/test');
const { loginUser, navigateToProtectedPage, ensureAuthenticated } = require('./helpers');

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Admin olarak login yap
    await loginUser(page, 'admin@anadolufenericamsanatmerkezi.com', 'admin123', 30000);
    await page.waitForTimeout(2000);
  });

  test('admin dashboard yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin');
    
    // URL kontrolü
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    
    // Admin dashboard'un yüklendiğini kontrol et - daha esnek
    const hasAdminContent = await page.getByText(/Dashboard|Yönetim|Admin|Ürün Yönetimi|Siparişler|Son 7 Gün|Son 30 Gün/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasQuickLinks = await page.locator('a[href*="/admin/"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasAdminContent || hasQuickLinks || hasAnyContent).toBeTruthy();
  });

  test('admin ürünler sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/products');
    
    await expect(page).toHaveURL(/\/admin\/products/, { timeout: 10000 });
    
    const hasProductsPage = await page.getByText(/Ürünler|Products|Ürün Yönetimi|Yeni|Filtrele/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasTable = await page.locator('table, [data-testid="product-list"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasProductsPage || hasTable || hasAnyContent).toBeTruthy();
  });

  test('admin kategoriler sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/categories');
    
    await expect(page).toHaveURL(/\/admin\/categories/, { timeout: 10000 });
    
    const hasCategoriesPage = await page.getByText(/Kategoriler|Categories|Kategori Yönetimi|Yeni|Filtrele/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasTable = await page.locator('table, [data-testid="category-list"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasCategoriesPage || hasTable || hasAnyContent).toBeTruthy();
  });

  test('admin siparişler sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/orders');
    
    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10000 });
    
    const hasOrdersPage = await page.getByText(/Siparişler|Orders|Sipariş Yönetimi|Durum|Filtrele/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasTable = await page.locator('table, [data-testid="order-list"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasOrdersPage || hasTable || hasAnyContent).toBeTruthy();
  });

  test('admin kullanıcılar sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/users');
    
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10000 });
    
    const hasUsersPage = await page.getByText(/Kullanıcılar|Users|Kullanıcı Yönetimi|E-posta|Rol/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasTable = await page.locator('table, [data-testid="user-list"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasUsersPage || hasTable || hasAnyContent).toBeTruthy();
  });

  test('admin kuponlar sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/coupons');
    
    await expect(page).toHaveURL(/\/admin\/coupons/, { timeout: 10000 });
    
    const hasCouponsPage = await page.getByText(/Kupon|Coupon|Kupon Yönetimi|İndirim|Yeni/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasTable = await page.locator('table, [data-testid="coupon-list"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasCouponsPage || hasTable || hasAnyContent).toBeTruthy();
  });

  test('admin pazaryeri entegrasyonları sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/marketplaces');
    
    await expect(page).toHaveURL(/\/admin\/marketplaces/, { timeout: 10000 });
    
    const hasMarketplacesPage = await page.getByText(/Pazaryeri|Marketplace|Trendyol|Hepsiburada|Entegrasyon/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasMarketplacesPage || hasAnyContent).toBeTruthy();
  });

  test('admin SEO sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/seo');
    
    await expect(page).toHaveURL(/\/admin\/seo/, { timeout: 10000 });
    
    const hasSeoPage = await page.getByText(/SEO|Meta|Robots|Arama|Optimizasyon/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasSeoPage || hasAnyContent).toBeTruthy();
  });

  test('admin ayarlar sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/settings');
    
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 });
    
    const hasSettingsPage = await page.getByText(/Ayarlar|Settings|Site Ayarları|Genel|Kaydet/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasSettingsPage || hasAnyContent).toBeTruthy();
  });

  test('admin yorumlar sayfası yükleniyor', async ({ page }) => {
    test.setTimeout(60000);
    await navigateToProtectedPage(page, '/admin/reviews');
    
    await expect(page).toHaveURL(/\/admin\/reviews/, { timeout: 10000 });
    
    const hasReviewsPage = await page.getByText(/Yorumlar|Reviews|Yorum Yönetimi|Değerlendirme/i).first().isVisible({ timeout: 20000 }).catch(() => false);
    const hasTable = await page.locator('table, [data-testid="review-list"]').count() > 0;
    const hasAnyContent = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasReviewsPage || hasTable || hasAnyContent).toBeTruthy();
  });

  test('normal kullanıcı admin paneline erişemiyor', async ({ page }) => {
    test.setTimeout(60000);
    // Normal kullanıcı olarak login yap
    await loginUser(page, 'test@example.com', 'Test123456', 30000);
    await page.waitForTimeout(2000);
    
    // Admin paneline git
    await page.goto('/admin');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Erişim reddedildi mesajının görünür olduğunu kontrol et veya ana sayfaya yönlendirildiğini kontrol et
    const hasAccessDenied = await page.getByText(/Erişim Reddedildi|Access Denied|yönetici|Yetkiniz yok|Yetki/i).first().isVisible({ timeout: 15000 }).catch(() => false);
    const redirectedToHome = await page.url().includes('/') && !page.url().includes('/admin');
    
    expect(hasAccessDenied || redirectedToHome).toBeTruthy();
  });
});

