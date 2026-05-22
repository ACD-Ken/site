const { test, expect } = require('@playwright/test');

const visibleProjectCards = page => page.locator('.project-card:visible');

test('project filters show the expected project groups', async ({ page }) => {
  await page.goto('/projects.html');

  await expect(visibleProjectCards(page)).toHaveCount(6);

  await page.getByRole('button', { name: 'Automation' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(1);
  await expect(page.locator('#n8n-orchestrator')).toBeVisible();

  await page.getByRole('button', { name: 'Capstone' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(4);
  await expect(page.locator('#chatbot-on-website')).toBeVisible();
  await expect(page.locator('#chatbot-on-website').getByRole('heading', { name: 'ACD-Bot' })).toBeVisible();
  await expect(page.locator('#chatbot-on-website')).toContainText('Phase 1 RAG-assisted portfolio assistant');
  await expect(page.locator('#m7-client-lead-agent')).toBeVisible();
  await expect(page.locator('#m7-client-lead-agent').locator('.status-badge.completed')).toContainText('Live Demo');
  await expect(page.locator('#m7-client-lead-agent').getByRole('link', { name: 'View Live Demo' })).toHaveAttribute('href', 'm7-client-lead-agent.html');
  await expect(page.locator('#hr-agentic-agent')).toBeVisible();
  await expect(page.locator('#inventory-ai-agent')).toBeVisible();
  await expect(page.locator('#inventory-ai-agent').locator('.status-badge.completed')).toContainText('V2 Verified');
  await expect(page.locator('#inventory-ai-agent')).toContainText('Verified capstone workflow for reliable inventory audits');
  await expect(page.locator('#inventory-ai-agent').getByRole('link', { name: 'View Details' })).toHaveAttribute('href', 'inventory-agent.html');
  await expect(page.locator('#inventory-ai-agent').getByRole('link', { name: 'Workflow Video' })).toHaveAttribute('href', 'content/inventory-agent/inventory-v2-demo.mp4');

  await page.getByRole('button', { name: 'Web Apps' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(1);
  await expect(page.locator('#lucky7-toto')).toBeVisible();

  await page.getByRole('button', { name: 'All Projects' }).click();
  await expect(visibleProjectCards(page)).toHaveCount(6);
});

test('M7 Client Lead Agent card links to the live Telegram capstone page', async ({ page }) => {
  await page.goto('/projects.html#m7-client-lead-agent/');

  await expect(page).toHaveURL(/#m7-client-lead-agent$/);

  const capstoneCard = page.locator('#m7-client-lead-agent');
  await expect(capstoneCard).toBeVisible();
  await expect(capstoneCard.locator('.status-badge.completed')).toContainText('Live Demo');
  await expect(capstoneCard.getByText('tested Telegram lead qualification bot powered by n8n')).toBeVisible();
  await expect(capstoneCard.locator('.metric', { hasText: 'Workflows' })).toContainText('2');
  await expect(capstoneCard.locator('.metric', { hasText: 'E2E Test' })).toContainText('Pass');
  await expect(capstoneCard.getByRole('link', { name: 'View Live Demo' })).toHaveAttribute('href', 'm7-client-lead-agent.html');
  await expect(capstoneCard.getByRole('link', { name: 'Try Telegram Bot' })).toHaveAttribute('href', 'https://t.me/AlsoCan_Bot');

  await capstoneCard.getByRole('link', { name: 'View Live Demo' }).click();
  await expect(page).toHaveURL(/m7-client-lead-agent\.html$/);
  await expect(page.getByRole('heading', { name: /AI Lead Qualification/ })).toBeVisible();
  const workflowImage = page.getByRole('img', { name: 'Published n8n editor view for the M7 Telegram Lead Qualification Bot workflow' });
  await expect(workflowImage).toHaveAttribute('src', 'content/m7-client-lead-agent/n8n-telegram-lead-workflow.png');
  await expect(workflowImage).toHaveCSS('max-width', '920px');
  await expect(page.getByRole('link', { name: 'Try Telegram Bot' }).first()).toHaveAttribute('href', 'https://t.me/AlsoCan_Bot');
  await expect(page.locator('main')).not.toContainText('Customer Rapport Assistant');
  await expect(page.locator('#test-status')).toContainText('Latest Test Status');
  await expect(page.locator('#test-status')).toContainText('lead with score 85');
  await expect(page.locator('#test-status')).toContainText('Live webhook trigger');
  await expect(page.locator('#test-status')).toContainText('Both production webhook entry points');
  await expect(page.locator('#service-catalog')).toContainText('RAG Service Catalog');
  await expect(page.locator('#service-catalog')).toContainText('Invoice And Document Extraction');
  await expect(page.locator('#service-catalog')).toContainText('Onboarding And FAQ Assistants');
  await expect(page.locator('#artifacts').getByRole('link', { name: 'Customer Rapport JSON' })).toHaveCount(0);
  await expect(page.locator('#artifacts').getByRole('link', { name: 'Telegram Bot JSON' })).toHaveAttribute('href', 'content/m7-client-lead-agent/telegram-lead-qualification-bot.json');
  await expect(page.locator('#artifacts').getByRole('link', { name: 'Test Results' })).toHaveAttribute('href', 'content/m7-client-lead-agent/test-results-2026-05-22.md');
});

test('HR Agentic Agent card links to the canonical V2 workflow page with planned roadmap', async ({ page }) => {
  await page.goto('/projects.html#hr-agentic-agent/');

  await expect(page).toHaveURL(/#hr-agentic-agent$/);

  const hrCard = page.locator('#hr-agentic-agent');
  await expect(hrCard).toBeVisible();
  await expect(hrCard.locator('.status-badge.completed')).toContainText('Completed');
  await expect(hrCard.getByText('Completed V2 capstone workflow')).toBeVisible();
  await expect(hrCard.locator('.metric', { hasText: 'Version' })).toContainText('V2');
  await expect(hrCard.getByRole('link', { name: 'View V2 Workflow' })).toHaveAttribute('href', 'hr-agent-v2.html');
  await expect(hrCard.getByRole('link', { name: '60s Workflow Video' })).toHaveAttribute('href', 'content/hr-agent/n8n-demo-60s.mp4');
  await expect(hrCard.getByRole('link', { name: 'V3/V4 Planned' })).toHaveAttribute('href', 'hr-agent-v2.html#roadmap');

  await hrCard.getByRole('link', { name: 'View V2 Workflow' }).click();
  await expect(page).toHaveURL(/hr-agent-v2\.html$/);
  await expect(page.getByRole('heading', { name: /HR Agent Auditable Workflow/ })).toBeVisible();
  await expect(page.locator('#artifacts').getByRole('link', { name: 'Sanitized V2 JSON' })).toHaveAttribute('href', 'content/hr-agent/05_HR_Agent_v2.json');
  await expect(page.getByText('V2.1')).toHaveCount(0);
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
