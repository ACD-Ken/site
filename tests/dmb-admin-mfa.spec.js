const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const pageSource = readFileSync(join(__dirname, '../DMB/admin-login.html'), 'utf8')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^>]+><\/script>/, '');
const scriptSource = readFileSync(join(__dirname, '../js/dmb-admin-mfa.js'), 'utf8');
const origin = 'https://dmb-mfa.example.test';

async function open(page, { verified = false, admin = true, mode = 'devices' } = {}) {
  await page.route(origin + '/**', (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/site/DMB/admin-login.html') return route.fulfill({ contentType: 'text/html', body: pageSource });
    if (pathname === '/site/js/dmb-admin-mfa.js') return route.fulfill({ contentType: 'text/javascript', body: scriptSource });
    return route.fulfill({ contentType: 'text/html', body: '<h1>Admin console fixture</h1>' });
  });
  await page.addInitScript(({ verified, admin }) => {
    let session = null;
    let aal = 'aal1';
    const ok = (data) => ({ data, error: null });
    const user = { id: 'admin-id', email: 'admin@example.test', email_confirmed_at: 'confirmed' };
    const verifiedFactor = { id: 'fixture-factor', status: 'verified' };
    const fakeClient = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ok(admin ? { role: 'admin' } : null) }) }),
      }),
      auth: {
        getSession: async () => ok({ session }),
        getUser: async () => ok({ user: session?.user }),
        signInWithPassword: async () => ok({ session: session = { user } }),
        signOut: async () => ok(session = null),
        mfa: {
          getAuthenticatorAssuranceLevel: async () => ok({ currentLevel: aal, nextLevel: verified ? 'aal2' : 'aal1' }),
          listFactors: async () => ok({ totp: verified ? [verifiedFactor] : [], all: [] }),
          enroll: async () => ok({
            id: verifiedFactor.id,
            totp: {
              qr_code: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="5" height="5"/></svg>',
              secret: 'FIXTURESETUPKEY',
            },
          }),
          challengeAndVerify: async ({ factorId, code }) => {
            if (factorId !== verifiedFactor.id || code !== '123456') return { error: new Error('Wrong fixture code') };
            aal = 'aal2';
            verified = true;
            return ok({ session });
          },
        },
      },
    };
    window.supabase = { createClient: () => fakeClient };
  }, { verified, admin });
  await page.goto(origin + '/site/DMB/admin-login.html?console=' + mode);
  await page.getByLabel('Email').fill('admin@example.test');
  await page.getByLabel('Password').fill('fixture-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

test('admin enrolls, retries an incorrect code and only continues with AAL2', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await open(page);
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  const qr = page.getByRole('img', { name: 'Authenticator setup QR code' });
  await expect(qr).toBeVisible();
  await expect.poll(() => qr.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByLabel('Authenticator code')).toBeFocused();
  await page.getByLabel('Authenticator code').fill('654321');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('alert')).toContainText('Code not verified');
  await expect(page).toHaveURL(/admin-login\.html/);
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(origin + '/dmsgbox-admin-console/');
});

test('enrolled admin is challenged with no setup key then returned to approvals', async ({ page }) => {
  await open(page, { verified: true, mode: 'approvals' });
  await expect(page.getByRole('heading', { name: 'Verify your sign-in' })).toBeVisible();
  await expect(page.locator('#mfa-qr')).not.toHaveAttribute('src');
  await page.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(origin + '/dmsgbox-admin-console/pending-approvals.html');
});

test('user without an admin grant cannot enroll from the admin login', async ({ page }) => {
  await open(page, { admin: false });
  await expect(page.getByRole('alert')).toContainText('does not have access');
  await expect(page.getByRole('button', { name: 'Set up authenticator' })).toBeHidden();
});
