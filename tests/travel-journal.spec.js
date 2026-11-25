const { test, expect } = require('@playwright/test');

test('travel story details show Facebook-reviewed copy and approved visual', async ({ page }) => {
  await page.goto('/travel.html');

  await page.getByRole('button', { name: /Bangkok Business Trip After Covid/ }).click();

  await expect(page.locator('#imageModal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText('Bangkok Business Trip After Covid');
  await expect(page.locator('#modalDescription')).toContainText('first business trip after more than two years');
  await expect(page.locator('#modalDescription')).toContainText('Facebook manual review');
  await expect(page.locator('#modalImage')).toHaveAttribute('src', /images\/travel\/bangkok-first-business-trip-after-covid\.jpg\?v=20260518-approved-images$/);
});

test('travel filters show the public event stories', async ({ page }) => {
  await page.goto('/travel.html');

  await page.locator('#travel-filters').getByRole('button', { name: 'Events', exact: true }).click();
  await expect(page.locator('#travel-journal').getByRole('heading', { name: 'Singapore TBWA Events' })).toBeVisible();
  await expect(page.locator('#travel-journal').getByRole('heading', { name: 'Bangkok Business Trip After Covid' })).toBeHidden();

});

test('approved travel images are available', async ({ request }) => {
  const imagePaths = [
    '/images/travel/bangkok-first-business-trip-after-covid.jpg',
    '/images/travel/singapore-tbwa-events.jpg'
  ];

  for (const imagePath of imagePaths) {
    const response = await request.get(imagePath);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('image/jpeg');
  }
});

test('the published travel dataset contains only public stories', async ({ request }) => {
  const response = await request.get('/data/travel-stories.json');
  expect(response.ok()).toBeTruthy();
  const stories = await response.json();
  expect(stories.length).toBeGreaterThan(0);
  expect(stories.every(story => story.visibility === 'public')).toBeTruthy();
});
