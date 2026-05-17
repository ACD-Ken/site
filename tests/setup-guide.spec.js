const { test, expect } = require('@playwright/test');

test('setup guide loads and TOC links work', async ({ page }) => {
  await page.goto('/setup-guide.html');
  await expect(page.locator('.main-content')).toBeVisible();

  const firstToc = page.locator('.toc-sidebar a').first();
  await expect(firstToc).toBeVisible();

  const href = await firstToc.getAttribute('href');
  const targetId = href.replace('#', '');

  await firstToc.click();
  await expect(page.locator(`#${targetId}`)).toBeVisible();
});
