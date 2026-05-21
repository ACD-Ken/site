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

  const navLinks = await page.locator('nav .nav-links a.nav-link').evaluateAll(links => links.map(link => link.textContent.trim()));
  expect(navLinks).toEqual(['Home', 'Portfolio', 'Vibe Code', 'Setup', 'Projects', 'Travel']);
});

test('projects page includes project-specific sharing metadata', async ({ page }) => {
  await page.goto('/projects.html');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://acd-ken.github.io/site/projects.html');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'AI & Automation Projects - Ken Wong');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://acd-ken.github.io/site/og-image.svg');
  await expect(page.locator('.hero.page-hero')).toBeVisible();
});

test('public pages use standardized shell metadata and page hero treatment', async ({ page }) => {
  const pages = [
    {
      path: '/kw-portfolio.html',
      canonical: 'https://acd-ken.github.io/site/kw-portfolio.html',
      title: 'Portfolio - Ken Wong'
    },
    {
      path: '/setup-guide.html',
      canonical: 'https://acd-ken.github.io/site/setup-guide.html',
      title: 'AI Developer Setup Guide - Ken Wong'
    },
    {
      path: '/vibe-code.html',
      canonical: 'https://acd-ken.github.io/site/vibe-code.html',
      title: 'Vibe Code Journey - Ken Wong'
    },
    {
      path: '/privacy.html',
      canonical: 'https://acd-ken.github.io/site/privacy.html',
      title: 'Privacy & Cookie Settings - Ken Wong'
    },
    {
      path: '/hr-agent-v2.html',
      canonical: 'https://acd-ken.github.io/site/hr-agent-v2.html',
      title: 'HR Agent V2 - Auditable Agentic Workflow'
    }
  ];

  for (const pageInfo of pages) {
    await page.goto(pageInfo.path);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', pageInfo.canonical);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', pageInfo.title);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://acd-ken.github.io/site/og-image.svg');
    await expect(page.locator('.nav-links')).toBeVisible();
    await expect(page.locator('.hero, .hero.page-hero').first()).toBeVisible();
  }
});

test('vibe code page tells the AI-assisted coding journey', async ({ page }) => {
  await page.goto('/vibe-code.html');

  await expect(page.getByRole('heading', { name: 'Four months of learning by building with AI' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'February 2026: Starting with VS Code and GitHub Copilot Pro' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Late April 2026: Testing OpenCode with free models' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mid-May 2026: Switching toward OpenAI Codex' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View Capstone Projects' })).toHaveAttribute('href', 'projects.html');
});

test('travel page shows public travel stories without a password', async ({ page }) => {
  page.on('dialog', async dialog => {
    throw new Error(`Unexpected dialog: ${dialog.message()}`);
  });
  await page.goto('/travel.html');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://acd-ken.github.io/site/travel.html');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Travel Journal - Ken Wong');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://acd-ken.github.io/site/og-image.svg');
  await expect(page.locator('.hero.page-hero')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bangkok Business Trip After Covid' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Genting Camping Mountain Reset' })).toBeHidden();
});

test('travel page keeps personal stories hidden when unlock password is wrong', async ({ page }) => {
  page.once('dialog', dialog => dialog.accept('wrong-password'));

  await page.goto('/travel.html');
  await page.getByRole('button', { name: 'Unlock personal travel' }).click();

  await expect(page.getByRole('heading', { name: 'Bangkok Business Trip After Covid' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Genting Camping Mountain Reset' })).toBeHidden();
  await expect(page.getByText('Personal stories stay private until unlocked.')).toBeVisible();
});

test('travel page reveals personal stories after the correct password', async ({ page }) => {
  page.once('dialog', dialog => dialog.accept('AlsoCanDo'));

  await page.goto('/travel.html');
  await page.getByRole('button', { name: 'Unlock personal travel' }).click();

  await expect(page.getByRole('heading', { name: 'Genting Camping Mountain Reset' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Personal Travel', exact: true })).toBeVisible();
});
