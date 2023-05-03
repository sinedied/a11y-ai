// @ts-check
const process = require('node:process');
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './base',
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'dot',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
