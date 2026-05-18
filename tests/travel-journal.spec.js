const { test, expect } = require('@playwright/test');

test('travel story details show Facebook-reviewed copy and fallback visual', async ({ page }) => {
  await page.goto('/travel.html');

  await page.getByRole('button', { name: /Bangkok Business Trip After Covid/ }).click();

  await expect(page.locator('#imageModal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText('Bangkok Business Trip After Covid');
  await expect(page.locator('#modalDescription')).toContainText('first business trip after more than two years');
  await expect(page.locator('#modalDescription')).toContainText('Facebook manual review');
  await expect(page.locator('#modalImage')).toHaveAttribute('src', /^data:image\/svg\+xml/);
});

test('travel filters include events and avoid a blank locked personal view', async ({ page }) => {
  await page.goto('/travel.html');

  await page.locator('#travel-filters').getByRole('button', { name: 'Events', exact: true }).click();
  await expect(page.locator('#travel-journal').getByRole('heading', { name: 'Singapore TBWA Events' })).toBeVisible();
  await expect(page.locator('#travel-journal').getByRole('heading', { name: 'Bangkok Business Trip After Covid' })).toBeHidden();

  await page.locator('#travel-filters').getByRole('button', { name: 'Personal Travel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unlock personal travel' })).toBeVisible();
  await expect(page.getByText('Personal travel stories are hidden until you enter the password.')).toBeVisible();
});
