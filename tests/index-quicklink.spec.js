const { test, expect } = require('@playwright/test');

test('homepage quick link navigates to My Mac Config', async ({ page }) => {
  // Visit the homepage on the local preview server (port 8001)
  await page.goto('http://localhost:8001/index.html');

  // Click the quick link that points to the My Mac Config anchor
  await page.click('a.link-card[href="setup-guide.html#my-mac-config"]');

  // Wait for navigation to the setup guide page including the fragment
  await page.waitForURL(/setup-guide.html#my-mac-config/);

  // Wait for the markdown content to load
  await page.waitForSelector('#markdown-content', { state: 'visible' });

  // Ensure the machine text is visible (anchors may be empty/hidden)
  await expect(page.locator('text=MacBook Air (M4)')).toBeVisible();
});
