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
  await expect(page.locator('#chatbot-on-website').getByRole('heading', { name: 'ACD-Bot' })).toBeVisible();
  await expect(page.locator('#chatbot-on-website')).toContainText('Phase 1 RAG-assisted portfolio assistant');
  await expect(page.locator('#hr-agentic-agent')).toBeVisible();
  await expect(page.locator('#inventory-ai-agent')).toBeVisible();

  await page.getByRole('button', { name: 'Web Apps' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(1);
  await expect(page.locator('#lucky7-toto')).toBeVisible();

  await page.getByRole('button', { name: 'All Projects' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(6);
});

test('HR Agentic Agent card links to completed V2 page with planned roadmap', async ({ page }) => {
  await page.goto('/projects.html#hr-agentic-agent/');

  await expect(page).toHaveURL(/#hr-agentic-agent$/);

  const hrCard = page.locator('#hr-agentic-agent');
  await expect(hrCard).toBeVisible();
  await expect(hrCard.locator('.status-badge.completed')).toContainText('Completed');
  await expect(hrCard.getByText('Completed V2 capstone workflow')).toBeVisible();
  await expect(hrCard.getByRole('link', { name: 'View V2' })).toHaveAttribute('href', 'hr-agent-v2.html');
  await expect(hrCard.getByRole('link', { name: '60s n8n Demo' })).toHaveAttribute('href', 'content/hr-agent/n8n-demo-60s.mp4');
  await expect(hrCard.getByRole('link', { name: 'V3/V4 Planned' })).toHaveAttribute('href', 'hr-agent-v2.html#roadmap');

  await hrCard.getByRole('link', { name: 'View V2' }).click();
  await expect(page).toHaveURL(/hr-agent-v2\.html$/);
  await expect(page.getByRole('heading', { name: /HR Agent/ })).toBeVisible();
  await expect(page.locator('.hero-actions').getByRole('link', { name: '60s n8n Demo' })).toHaveAttribute('href', 'content/hr-agent/n8n-demo-60s.mp4');
  await expect(page.locator('#artifacts').getByRole('link', { name: '60s n8n Demo' })).toHaveAttribute('href', 'content/hr-agent/n8n-demo-60s.mp4');
  await expect(page.locator('.version-tag', { hasText: 'V2 Done' })).toBeVisible();
  await expect(page.locator('.version-tag', { hasText: 'V3 Planned' })).toBeVisible();
  await expect(page.locator('.version-tag', { hasText: 'V4 Planned' })).toBeVisible();
});

test('ACD-Bot project card opens the site chat widget', async ({ page }) => {
  await page.goto('/projects.html#chatbot-on-website');

  const acdBotCard = page.locator('#chatbot-on-website');
  const liveButton = acdBotCard.getByRole('button', { name: 'Live on Site' });

  await expect(liveButton).toBeEnabled();
  await liveButton.click();

  await expect(page.locator('#acd-chat-window')).toBeVisible();
  await expect(page.locator('.acd-msg.acd-bot')).toContainText("Hi! I'm ACD-Bot");
  await expect(page.locator('#acd-input')).toBeFocused();
});
