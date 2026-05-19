const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function source(relativePath) {
  return readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function exists(relativePath) {
  return existsSync(path.join(__dirname, '..', relativePath));
}

test('chat rate limiter does not key directly on spoofable X-Forwarded-For', () => {
  const server = source('server.js');

  assert.doesNotMatch(
    server,
    /keyGenerator:\s*\([^)]*\)\s*=>\s*[^,\n]*headers\[['"]x-forwarded-for['"]\]/,
  );
  assert.match(server, /function getRateLimitKey/);
  assert.match(server, /req\.socket\.remoteAddress/);
  assert.match(server, /keyGenerator:\s*getRateLimitKey/);
});

test('Supabase notification emails escape public form fields before rendering HTML', () => {
  const contact = source('supabase/functions/notify-contact/index.ts');
  const subscriber = source('supabase/functions/notify-subscriber/index.ts');

  for (const fnSource of [contact, subscriber]) {
    assert.match(fnSource, /function escapeHtml/);
  }

  assert.match(contact, /\$\{escapeHtml\(name\)\}/);
  assert.match(contact, /\$\{escapeHtml\(email\)\}/);
  assert.match(contact, /\$\{escapeHtml\(message\)\.replace/);

  assert.match(subscriber, /\$\{escapeHtml\(name\)\}/);
  assert.match(subscriber, /\$\{escapeHtml\(email\)\}/);
});

test('blog admin write access is restricted to explicit admins in RLS', () => {
  const migrationPath = 'supabase/migrations/202605190001_harden_blog_admin_rls.sql';
  assert.equal(exists(migrationPath), true);

  const migration = source(migrationPath);
  assert.match(migration, /create table if not exists public\.blog_admins/i);
  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /create or replace function private\.is_blog_admin/i);
  assert.match(migration, /drop policy if exists "Admin full access" on public\.blog_posts/i);
  assert.match(migration, /private\.is_blog_admin\(\)/i);
  assert.doesNotMatch(migration, /auth\.role\(\)\s*=\s*'authenticated'/i);

  const admin = source('DMB/admin.html');
  assert.match(admin, /async function assertBlogAdmin/);
  assert.match(admin, /\.from\('blog_admins'\)/);
});

test('public blog surfaces sanitize stored post HTML and escape metadata fields', () => {
  const post = source('DMB/blog-post.html');
  const blog = source('DMB/blog.html');
  const index = source('DMB/index.html');

  assert.match(post, /function sanitizeBlogHtml/);
  assert.doesNotMatch(post, /article-body'\)\.innerHTML\s*=\s*marked\.parse/);
  assert.match(post, /innerHTML\s*=\s*sanitizeBlogHtml\(marked\.parse\(post\.content \|\| ''\)\)/);

  for (const page of [blog, index]) {
    assert.match(page, /function escapeHtml/);
    assert.match(page, /\$\{escapeHtml\(post\.title\)\}/);
    assert.match(page, /\$\{escapeHtml\(post\.excerpt \|\| ''\)\}/);
    assert.match(page, /\$\{escapeHtml\(post\.category \|\| 'General'\)\}/);
    assert.match(page, /\$\{escapeHtml\(post\.read_time \|\| '5 min read'\)\}/);
  }
});

test('waitlist status does not expose all subscriber emails to authenticated browsers', () => {
  const migrationPath = 'supabase/migrations/202605190002_harden_subscriber_privacy.sql';
  assert.equal(exists(migrationPath), true);

  const migration = source(migrationPath);
  assert.match(migration, /create schema if not exists private/i);
  assert.match(migration, /create or replace function private\.get_waitlist_status/i);
  assert.match(migration, /create or replace function public\.get_waitlist_status/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /returns table\s*\(\s*is_subscribed boolean,\s*"position" integer/i);
  assert.match(migration, /\(row_number\(\) over\s*\(order by created_at asc, id asc\)\)::integer/i);
  assert.match(migration, /drop policy if exists "Subscribers can read own row" on public\.subscribers/i);
  assert.match(migration, /using \(lower\(email\) = nullif\(lower\(auth\.jwt\(\) ->> 'email'\), ''\)\)/i);

  const dashboard = source('DMB/dashboard.html');
  const download = source('DMB/download.html');

  assert.doesNotMatch(dashboard, /\.from\('subscribers'\)\.select\('id, email, created_at'\)/);
  assert.doesNotMatch(dashboard, /\.from\('subscribers'\)\.select\('\*'/);
  assert.doesNotMatch(download, /\.from\('subscribers'\)\.select/);

  assert.match(dashboard, /\.rpc\('get_waitlist_status'\)/);
  assert.match(download, /\.rpc\('get_waitlist_status'\)/);
});
