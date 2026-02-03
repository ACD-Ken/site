const { test, expect } = require('@playwright/test');

test('setup guide loads and TOC links work', async ({ page }) => {
  // Use baseURL from playwright.config.js; server should be started at http://localhost:8000
  await page.goto('/setup-guide.html');
  await expect(page.locator('#markdown-content')).toBeVisible();

  const firstToc = page.locator('#toc a').first();
  await expect(firstToc).toBeVisible();

  const href = await firstToc.getAttribute('href');
  const targetId = href.replace('#', '');

  await firstToc.click();
  await expect(page.locator(`#${targetId}`)).toBeVisible();
});
