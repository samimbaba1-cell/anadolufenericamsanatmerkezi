/**
 * Bu konuşmada eklenen/düzeltilen parçaların diskte durduğunu doğrular.
 * Undo sonrası: kök dizinden `node scripts/verify-conversation-patches.js`
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let failed = 0;
function check(name, ok, detail = '') {
  if (!ok) {
    failed += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`OK: ${name}`);
  }
}

try {
  check('marketplaceAdapters/index.js', fs.existsSync(path.join(root, 'backend/src/services/marketplaceAdapters/index.js')));
  const pushSvc = read('backend/src/services/marketplacePushService.js');
  check('marketplacePushService uses adapters', pushSvc.includes('getAdapter') && pushSvc.includes('listRegisteredMarketplaces'));

  const media = read('backend/src/routes/media.js');
  check('media DELETE uses destroy()', media.includes('await file.destroy()'));
  check('media DELETE no Mongo deleteOne', !media.includes('MediaFile.deleteOne'));

  const admin = read('backend/src/routes/admin.js');
  check('admin GET marketplaces/providers', admin.includes('/marketplaces/providers'));
  check('admin settings uses req.admin.id', admin.includes('req.admin.id') && !admin.includes('req.admin._id'));

  const settings = read('backend/src/services/settingsService.js');
  check('settings mergeThemeShallow', settings.includes('mergeThemeShallow') && settings.includes('updatedById: adminId'));

  const banners = read('backend/src/routes/banners.js');
  check('banner PUT merges existing', banners.includes('mergedInput'));
  check('banner PUT persists (update call)', banners.includes('banner.update(updates)'));

  const home = read('frontend/src/app/Anadolu Feneri Cam sanat Merkezi.js');
  check('homepage hero from API', home.includes('heroBanners') && home.includes('/api/banners'));
  check('homepage resolveMediaUrl', home.includes('resolveMediaUrl'));

  const mp = read('frontend/src/app/admin/marketplaces/page.js');
  check('marketplaces pushProviders + displayName', mp.includes('pushProviders') && mp.includes('marketplaceDisplayName'));

  const pw = read('frontend/playwright.config.js');
  check('playwright admin-full project', pw.includes("'admin-full'") || pw.includes('"admin-full"'));
  check('playwright chromium testIgnore', pw.includes('testIgnore'));

  const pkg = read('frontend/package.json');
  check('npm script test:e2e:admin-full', pkg.includes('test:e2e:admin-full'));

  const nginx = read('nginx.conf');
  check('nginx server_name + body size', nginx.includes('server_name _') && nginx.includes('client_max_body_size'));

  const nc = read('frontend/next.config.js');
  check('next.config 127.0.0.1 uploads', nc.includes("'127.0.0.1'") && nc.includes('/uploads/**'));

  check('.env.docker.example', fs.existsSync(path.join(root, '.env.docker.example')));
  check('docker-compose.prod.yml', fs.existsSync(path.join(root, 'docker-compose.prod.yml')));
  check('deploy-production-docker.sh', fs.existsSync(path.join(root, 'scripts/deploy-production-docker.sh')));

  const canli = read('CANLIYA_ALMA.md');
  check('CANLIYA_ALMA Docker bölümü', canli.includes('## 6)') && canli.includes('Docker'));
} catch (e) {
  console.error('Script error:', e.message);
  failed += 1;
}

if (failed) {
  console.error(`\n${failed} kontrol başarısız. Undo ile dosyalar geri gelmiş olabilir; bu branch’i tekrar uygula.`);
  process.exit(1);
}
console.log('\nTüm kontroller geçti.');
process.exit(0);
