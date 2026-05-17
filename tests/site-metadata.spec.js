const { test, expect } = require('@playwright/test');

test('homepage includes capabilities proof and sharing metadata', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://acd-ken.github.io/site/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://acd-ken.github.io/site/og-image.svg');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  await expect(page.getByRole('heading', { name: 'What I Build' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI Website Chatbot' })).toBeVisible();
  await expect(page.locator('.proof-value', { hasText: '30+' })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Start with the workflow you want to improve' })).toBeVisible();
  await expect(page.getByRole('link', { name: /AI Website Chatbot/ })).toHaveAttribute('href', /subject=AI%20Website%20Chatbot%20Inquiry/);
  await expect(page.getByRole('link', { name: /Workflow Automation/ })).toHaveAttribute('href', /subject=Workflow%20Automation%20Inquiry/);
  await expect(page.getByRole('link', { name: /Business AI Agent/ })).toHaveAttribute('href', /subject=AI%20Agent%20Inquiry/);
});

test('projects page includes project-specific sharing metadata', async ({ page }) => {
  await page.goto('/projects.html');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://acd-ken.github.io/site/projects.html');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'AI & Automation Projects - Ken Wong');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://acd-ken.github.io/site/og-image.svg');
});
