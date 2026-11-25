const { test, expect } = require('@playwright/test');

test.use({ bypassCSP: true });

test('the chat widget displays the daily usage limit and retry estimate', async ({ page }) => {
  await page.route('http://localhost:3000/api/chat', route => route.fulfill({
    status: 429,
    headers: { 'Access-Control-Allow-Origin': '*' },
    json: { code: 'CHAT_DAILY_LIMIT', retryAfterSeconds: 7200 },
  }));
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'Open chat' }).click();
  await page.getByRole('textbox', { name: 'Your message' }).fill('Tell me about Ken');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.acd-msg.acd-bot').last()).toHaveText(
    'ACD-Bot has reached its daily usage limit. Please try again in about 2 hours.',
  );
});
