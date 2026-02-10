const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  use: {
    baseURL: 'http://localhost:8001',
    headless: true,
    viewport: { width: 1280, height: 800 }
  },
  reporter: [['list'], ['junit', { outputFile: 'test-results/results.xml' }]]
});
