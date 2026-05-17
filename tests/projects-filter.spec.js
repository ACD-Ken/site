const { test, expect } = require('@playwright/test');

const visibleProjectCards = page => page.locator('.project-card:visible');

test('project filters show the expected project groups', async ({ page }) => {
  await page.goto('/projects.html');

  await expect(visibleProjectCards(page)).toHaveCount(6);

  await page.getByRole('button', { name: 'Automation' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(2);
  await expect(page.locator('#n8n-orchestrator')).toBeVisible();
  await expect(page.locator('#docker-monitor')).toBeVisible();

  await page.getByRole('button', { name: 'Capstone' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(3);
  await expect(page.locator('#chatbot-on-website')).toBeVisible();
  await expect(page.locator('#hr-agentic-agent')).toBeVisible();
  await expect(page.locator('#inventory-ai-agent')).toBeVisible();

  await page.getByRole('button', { name: 'Web Apps' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(1);
  await expect(page.locator('#lucky7-toto')).toBeVisible();

  await page.getByRole('button', { name: 'All Projects' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(6);
});
