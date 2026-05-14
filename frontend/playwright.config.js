// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

function getBackendPortForPlaywright() {
  if (process.env.PLAYWRIGHT_API_URL) {
    const m = String(process.env.PLAYWRIGHT_API_URL).match(/:(\d+)(?:\/|$)/);
    if (m) return m[1];
  }
  const envPath = path.join(__dirname, '..', 'backend', '.env');
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

// IPv4 kullan - localhost bazen ::1 (IPv6) çözülüp ECONNREFUSED veriyor (Mobile Safari / WebKit)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3001';
const backendPort = getBackendPortForPlaywright();
const API_URL = process.env.PLAYWRIGHT_API_URL || `http://127.0.0.1:${backendPort}`;
if (!process.env.PLAYWRIGHT_API_URL) process.env.PLAYWRIGHT_API_URL = API_URL;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  globalSetup: './tests/global-setup.js',
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 4, // Firefox browserContext.close hatalarını önlemek için worker sayısını azalt
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Increase default timeout for all actions */
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },
  
  /* Global test timeout */
  timeout: 180000, // 3 dakika - Retry mekanizmaları ve Firefox delay'leri için

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        /admin-comprehensive\.spec\.js/,
        /manual-automated-comprehensive\.spec\.js/
      ]
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    {
      name: 'admin-full',
      testMatch: [
        /admin-comprehensive\.spec\.js/,
        /manual-automated-comprehensive\.spec\.js/
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm start',
      cwd: path.resolve(__dirname, '../backend'),
      url: `${API_URL}/health`,
      reuseExistingServer: true, // Mevcut backend'i kullan, kapatma
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev',
      url: BASE_URL,
      reuseExistingServer: true, // Mevcut frontend'i kullan, kapatma
      timeout: 120 * 1000,
    },
  ],
});
