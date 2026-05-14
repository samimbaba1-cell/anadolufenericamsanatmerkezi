const path = require('path');
const fs = require('fs');
const seedData = require('../../backend/scripts/seedData');

function getBackendPortFromEnvFile() {
  const envPath = process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '../../backend/.env');
  try {
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      const m = raw.match(/^\s*PORT\s*=\s*(\d+)/m);
      if (m) return m[1];
    }
  } catch (_) {
    // ignore
  }
  return '3000';
}

module.exports = async () => {
  // IPv4 kullan - localhost ::1 (IPv6) ECONNREFUSED verebiliyor (WebKit/Mobile Safari)
  process.env.PLAYWRIGHT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
  const port = getBackendPortFromEnvFile();
  process.env.PLAYWRIGHT_API_URL = process.env.PLAYWRIGHT_API_URL || `http://127.0.0.1:${port}`;
  process.env.BACKEND_ENV_PATH = process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '../../backend/.env');
  await seedData();
};

