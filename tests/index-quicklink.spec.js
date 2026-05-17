const { test, expect } = require('@playwright/test');

test('homepage quick link navigates to My Mac Config', async ({ page }) => {
  await page.goto('/index.html');

  await page.click('nav a.nav-link[href="setup-guide.html"]');
  await page.waitForURL(/setup-guide.html/);

  await page.click('a.hero-btn[href="#config"]');
  await page.waitForURL(/setup-guide.html#config/);

  // Ensure the machine text is visible (anchors may be empty/hidden)
  await expect(page.locator('text=MacBook Air (M4)')).toBeVisible();
});
