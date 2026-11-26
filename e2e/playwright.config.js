const { defineConfig } = require('@playwright/test');
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8081';
const url = new URL(baseURL);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('E2E_BASE_URL must be a local HTTP address');
module.exports = defineConfig({
  testDir: './tests', timeout: 45000, expect: { timeout: 10000 }, workers: 1,
  reporter: 'list', use: { baseURL, browserName: 'chromium', channel: 'chrome', trace: 'off', screenshot: 'off' },
});
