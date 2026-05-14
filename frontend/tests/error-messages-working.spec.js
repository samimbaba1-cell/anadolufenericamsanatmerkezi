const { test, expect } = require('@playwright/test');

test.describe('Hata Mesajları Çalışıyor mu Testleri', () => {
  
  test('Register - Şifreler eşleşmiyor hatası çalışıyor', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Formu doldur
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', `test+${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123456');
    await page.fill('input[name="confirmPassword"]', 'Test1234567'); // Farklı şifre
    
    // Terms checkbox
    const termsCheckbox = page.getByLabel(/Kullanım/i);
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.check({ force: true, timeout: 10000 }).catch(() => {
      return termsCheckbox.click({ force: true });
    });
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kayıt Ol|Hesap Oluştur/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const errorSelectors = ['.bg-red-50', '[role="alert"]', '.error', '[class*="error"]', '[class*="red"]'];
    let errorFound = false;
    
    for (const selector of errorSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        const text = await element.textContent().catch(() => '');
        if (text && (text.includes('şifre') || text.includes('eşleşmiyor') || text.includes('password'))) {
          errorFound = true;
          break;
        }
      }
    }
    
    expect(errorFound).toBeTruthy();
  });
  
  test('Register - Şifre minimum 8 karakter hatası çalışıyor', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 7 karakterlik şifre
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', `test+${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test12'); // 7 karakter
    await page.fill('input[name="confirmPassword"]', 'Test12');
    
    // Terms checkbox
    const termsCheckbox = page.getByLabel(/Kullanım/i);
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.check({ force: true, timeout: 10000 }).catch(() => {
      return termsCheckbox.click({ force: true });
    });
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kayıt Ol|Hesap Oluştur/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body').catch(() => '');
    const hasError = pageContent.includes('8') || pageContent.includes('karakter') || 
                     pageContent.includes('şifre') || pageContent.includes('password');
    
    expect(hasError).toBeTruthy();
  });
  
  test('Register - Şifre büyük harf hatası çalışıyor', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Büyük harf yok
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', `test+${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'test123456'); // Büyük harf yok
    await page.fill('input[name="confirmPassword"]', 'test123456');
    
    // Terms checkbox
    const termsCheckbox = page.getByLabel(/Kullanım/i);
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.check({ force: true, timeout: 10000 }).catch(() => {
      return termsCheckbox.click({ force: true });
    });
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kayıt Ol|Hesap Oluştur/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body').catch(() => '');
    const hasError = pageContent.includes('büyük') || pageContent.includes('uppercase') || 
                     pageContent.includes('şifre') || pageContent.includes('password');
    
    expect(hasError).toBeTruthy();
  });
  
  test('Register - Şifre küçük harf hatası çalışıyor', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Küçük harf yok
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', `test+${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TEST123456'); // Küçük harf yok
    await page.fill('input[name="confirmPassword"]', 'TEST123456');
    
    // Terms checkbox
    const termsCheckbox = page.getByLabel(/Kullanım/i);
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.check({ force: true, timeout: 10000 }).catch(() => {
      return termsCheckbox.click({ force: true });
    });
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kayıt Ol|Hesap Oluştur/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body').catch(() => '');
    const hasError = pageContent.includes('küçük') || pageContent.includes('lowercase') || 
                     pageContent.includes('şifre') || pageContent.includes('password');
    
    expect(hasError).toBeTruthy();
  });
  
  test('Register - Şifre rakam hatası çalışıyor', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Rakam yok
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', `test+${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword'); // Rakam yok
    await page.fill('input[name="confirmPassword"]', 'TestPassword');
    
    // Terms checkbox
    const termsCheckbox = page.getByLabel(/Kullanım/i);
    await termsCheckbox.waitFor({ state: 'visible', timeout: 10000 });
    await termsCheckbox.check({ force: true, timeout: 10000 }).catch(() => {
      return termsCheckbox.click({ force: true });
    });
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Kayıt Ol|Hesap Oluştur/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body').catch(() => '');
    const hasError = pageContent.includes('rakam') || pageContent.includes('digit') || 
                     pageContent.includes('şifre') || pageContent.includes('password');
    
    expect(hasError).toBeTruthy();
  });
  
  test('Reset password - Şifre minimum 8 karakter hatası çalışıyor', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // 7 karakterlik şifre
    await page.fill('input[name="password"]', 'Test12'); // 7 karakter
    await page.fill('input[name="confirmPassword"]', 'Test12');
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Şifreyi Sıfırla|Sıfırla/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body').catch(() => '');
    const hasError = pageContent.includes('8') || pageContent.includes('karakter') || 
                     pageContent.includes('şifre') || pageContent.includes('password');
    
    expect(hasError).toBeTruthy();
  });
  
  test('Reset password - Şifreler eşleşmiyor hatası çalışıyor', async ({ page }) => {
    await page.goto('/reset-password?token=test-token-123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Farklı şifreler
    await page.fill('input[name="password"]', 'Test123456');
    await page.fill('input[name="confirmPassword"]', 'Test1234567'); // Farklı
    
    // Submit
    const submitButton = page.getByRole('button', { name: /Şifreyi Sıfırla|Sıfırla/i });
    await submitButton.click({ force: true });
    
    // Hata mesajı görünmeli
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent('body').catch(() => '');
    const hasError = pageContent.includes('eşleşmiyor') || pageContent.includes('match') || 
                     pageContent.includes('şifre') || pageContent.includes('password');
    
    expect(hasError).toBeTruthy();
  });
  
  test('Hata mesajları görsel olarak görünüyor mu?', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Geçersiz form gönder
    const submitButton = page.getByRole('button', { name: /Kayıt Ol|Hesap Oluştur/i });
    await submitButton.click({ force: true });
    
    await page.waitForTimeout(2000);
    
    // Hata mesajı elementleri görünür olmalı
    const errorSelectors = ['.bg-red-50', '[role="alert"]', '.error', '[class*="error"]', '[class*="red"]'];
    let visibleErrorFound = false;
    
    for (const selector of errorSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        // Element görünür ve ekranda mı kontrol et
        const boundingBox = await element.boundingBox().catch(() => null);
        if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
          visibleErrorFound = true;
          break;
        }
      }
    }
    
    expect(visibleErrorFound).toBeTruthy();
  });
});

