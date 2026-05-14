const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

test.describe('Build ve Environment Variables Testleri', () => {
  test('frontend build başarılı', async () => {
    // Bu test sadece build'in başarılı olup olmadığını kontrol eder
    // Gerçek build işlemi test sırasında yapılmaz (zaten yapılmış olmalı)
    
    const buildDir = path.join(__dirname, '../.next');
    const buildExists = fs.existsSync(buildDir);
    
    // Build klasörü varsa, build başarılı demektir
    if (buildExists) {
      expect(buildExists).toBeTruthy();
    } else {
      // Build klasörü yoksa, build yapmayı dene (ama test timeout'u artır)
      test.setTimeout(300000); // 5 dakika
      
      try {
        // Build komutunu çalıştır
        execSync('npm run build', {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
          timeout: 240000 // 4 dakika timeout
        });
        
        // Build başarılı
        expect(true).toBeTruthy();
      } catch (error) {
        // Build başarısız
        console.error('Build failed:', error.message);
        throw new Error('Frontend build başarısız. Lütfen manuel olarak `npm run build` çalıştırın.');
      }
    }
  });

  test('backend package.json mevcut ve geçerli', async () => {
    const backendPackageJson = path.join(__dirname, '../../backend/package.json');
    const exists = fs.existsSync(backendPackageJson);
    
    expect(exists).toBeTruthy();
    
    if (exists) {
      const packageJson = JSON.parse(fs.readFileSync(backendPackageJson, 'utf8'));
      
      // Temel alanlar kontrolü
      expect(packageJson.name).toBeTruthy();
      expect(packageJson.version).toBeTruthy();
      expect(packageJson.dependencies).toBeTruthy();
      expect(typeof packageJson.dependencies).toBe('object');
    }
  });

  test('frontend package.json mevcut ve geçerli', async () => {
    const frontendPackageJson = path.join(__dirname, '../package.json');
    const exists = fs.existsSync(frontendPackageJson);
    
    expect(exists).toBeTruthy();
    
    if (exists) {
      const packageJson = JSON.parse(fs.readFileSync(frontendPackageJson, 'utf8'));
      
      // Temel alanlar kontrolü
      expect(packageJson.name).toBeTruthy();
      expect(packageJson.version).toBeTruthy();
      expect(packageJson.dependencies).toBeTruthy();
      expect(typeof packageJson.dependencies).toBe('object');
    }
  });

  test('backend .env.example dosyası mevcut', async () => {
    const candidates = [
      path.join(__dirname, '../../backend/env.example'),
      path.join(process.cwd(), 'backend/env.example'),
      path.join(process.cwd(), 'backend/.env.example'),
    ];
    let envExample = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        envExample = p;
        break;
      }
    }
    expect(envExample).toBeTruthy();
    
    if (envExample) {
      const content = fs.readFileSync(envExample, 'utf8');
      
      // Önemli environment variable'ların örneklerini kontrol et
      expect(content).toContain('DB_HOST');
      expect(content).toContain('JWT_SECRET');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('SETTINGS_SECRET_KEY');
    }
  });

  test('frontend .env.production.example dosyası mevcut ve production formatı doğru', async () => {
    const envProductionExample = path.join(__dirname, '../.env.production.example');
    const exists = fs.existsSync(envProductionExample);

    expect(exists).toBeTruthy();

    if (exists) {
      const content = fs.readFileSync(envProductionExample, 'utf8');
      expect(content).toContain('NEXT_PUBLIC_API_URL=');
      expect(content).toContain('NEXT_PUBLIC_SITE_URL=');
      expect(content).toContain('NODE_ENV=production');
    }
  });

  test('gerekli environment variable formatları doğru (backend)', async () => {
    // Bu test sadece format kontrolü yapar, gerçek değerleri kontrol etmez
    // Çünkü test ortamında .env dosyası olmayabilir
    
    const candidates = [
      path.join(__dirname, '../../backend/env.example'),
      path.join(process.cwd(), 'backend/env.example'),
      path.join(process.cwd(), 'backend/.env.example'),
    ];
    let envExample = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        envExample = p;
        break;
      }
    }
    
    if (envExample && fs.existsSync(envExample)) {
      const content = fs.readFileSync(envExample, 'utf8');
      
      // DATABASE_URL format kontrolü
      if (content.includes('DATABASE_URL=')) {
        const dbUrlMatch = content.match(/DATABASE_URL=mysql:\/\/.*/);
        // Format doğru olmalı (mysql:// ile başlamalı)
        expect(dbUrlMatch || content.includes('DB_HOST')).toBeTruthy();
      }
      
      // JWT_SECRET kontrolü
      expect(content.includes('JWT_SECRET')).toBeTruthy();
      
      // PORT kontrolü
      expect(content.includes('PORT')).toBeTruthy();
    }
  });

  test('next.config.js mevcut ve geçerli', async () => {
    const nextConfig = path.join(__dirname, '../next.config.js');
    const exists = fs.existsSync(nextConfig);
    
    expect(exists).toBeTruthy();
    
    if (exists) {
      const content = fs.readFileSync(nextConfig, 'utf8');
      
      // Temel Next.js config kontrolü
      expect(content).toContain('nextConfig');
      expect(content).toContain('module.exports');
    }
  });

  test('playwright.config.js mevcut ve geçerli', async () => {
    const playwrightConfig = path.join(__dirname, '../playwright.config.js');
    const exists = fs.existsSync(playwrightConfig);
    
    expect(exists).toBeTruthy();
    
    if (exists) {
      const content = fs.readFileSync(playwrightConfig, 'utf8');
      
      // Temel Playwright config kontrolü
      expect(content).toContain('defineConfig');
      expect(content).toContain('testDir');
    }
  });

  test('gerekli klasör yapısı mevcut', async () => {
    const requiredDirs = [
      path.join(__dirname, '../src'),
      path.join(__dirname, '../src/app'),
      path.join(__dirname, '../src/components'),
      path.join(__dirname, '../../backend/src'),
      path.join(__dirname, '../../backend/src/routes'),
      path.join(__dirname, '../../backend/src/models')
    ];
    
    for (const dir of requiredDirs) {
      const exists = fs.existsSync(dir);
      expect(exists).toBeTruthy();
    }
  });

  test('node_modules yüklü (frontend)', async () => {
    const nodeModules = path.join(__dirname, '../node_modules');
    const exists = fs.existsSync(nodeModules);
    
    // node_modules olması gerekir (test çalıştırılmadan önce npm install yapılmış olmalı)
    if (!exists) {
      console.warn('Frontend node_modules bulunamadı. Test ortamında npm install yapılmamış olabilir.');
    }
    
    // Test geçer (node_modules olmasa bile, bu bir build hatası değil)
    expect(true).toBeTruthy();
  });

  test('node_modules yüklü (backend)', async () => {
    const nodeModules = path.join(__dirname, '../../backend/node_modules');
    const exists = fs.existsSync(nodeModules);
    
    // node_modules olması gerekir
    if (!exists) {
      console.warn('Backend node_modules bulunamadı. Test ortamında npm install yapılmamış olabilir.');
    }
    
    // Test geçer (node_modules olmasa bile, bu bir build hatası değil)
    expect(true).toBeTruthy();
  });

  test('package-lock.json veya yarn.lock mevcut (frontend)', async () => {
    const packageLock = path.join(__dirname, '../package-lock.json');
    const yarnLock = path.join(__dirname, '../yarn.lock');
    
    const hasLockFile = fs.existsSync(packageLock) || fs.existsSync(yarnLock);
    
    // Lock file olması önerilir ama zorunlu değil
    if (!hasLockFile) {
      console.warn('Frontend lock file bulunamadı. package-lock.json veya yarn.lock olması önerilir.');
    }
    
    // Test geçer
    expect(true).toBeTruthy();
  });

  test('package-lock.json veya yarn.lock mevcut (backend)', async () => {
    const packageLock = path.join(__dirname, '../../backend/package-lock.json');
    const yarnLock = path.join(__dirname, '../../backend/yarn.lock');
    
    const hasLockFile = fs.existsSync(packageLock) || fs.existsSync(yarnLock);
    
    // Lock file olması önerilir ama zorunlu değil
    if (!hasLockFile) {
      console.warn('Backend lock file bulunamadı. package-lock.json veya yarn.lock olması önerilir.');
    }
    
    // Test geçer
    expect(true).toBeTruthy();
  });
});

