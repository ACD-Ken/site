const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { once } = require('node:events');
const { createChatApp } = require('../chat-api');
const { createChatBudget } = require('../chat-budget');

function source(relativePath) {
  return readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function exists(relativePath) {
  return existsSync(path.join(__dirname, '..', relativePath));
}

async function serveChat(t, app) {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}/api/chat`;
}

test('chat rate limiter does not key directly on spoofable X-Forwarded-For', () => {
  const server = source('chat-api.js');

  assert.doesNotMatch(
    server,
    /keyGenerator:\s*\([^)]*\)\s*=>\s*[^,\n]*headers\[['"]x-forwarded-for['"]\]/,
  );
  assert.match(server, /function getRateLimitKey/);
  assert.match(server, /req\.socket\.remoteAddress/);
  assert.match(server, /keyGenerator:\s*getRateLimitKey/);
});

test('chat HTTP endpoint validates browser requests before using the provider', async t => {
  const calls = [];
  const client = { chat: { completions: { create: async request => {
    calls.push(request);
    return { choices: [{ message: { content: 'A test reply' } }] };
  } } } };
  const url = await serveChat(t, createChatApp({
    client, model: 'test', systemPrompt: 'test', budget: createChatBudget({ dailyLimit: 1 }),
  }));
  const origin = 'https://acd-ken.github.io';
  const post = (body, headers = {}) => fetch(url, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body,
  });
  const question = JSON.stringify({ messages: [{ role: 'user', content: 'Tell me about Ken' }] });

  assert.equal((await post(question, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await post(question, { Origin: 'http://localhost:8000' })).status, 403);
  const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.match(preflight.headers.get('vary'), /Origin/i);
  assert.equal((await fetch(url)).status, 405);
  assert.equal((await post(question, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(JSON.stringify({ messages: [null, { role: 'user', content: 'Hi' }] }))).status, 400);
  assert.equal((await post(JSON.stringify({ messages: [{ role: 'assistant', content: 'Hello' }] }))).status, 400);
  assert.equal((await post(JSON.stringify({ messages: [{ role: 'user', content: 'a'.repeat(33_000) }] }))).status, 413);
  assert.equal(calls.length, 0);

  const answer = await post(question);
  assert.equal(answer.status, 200);
  assert.equal(answer.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await answer.json(), { reply: 'A test reply' });
  assert.equal(calls[0].messages.at(-1).content, 'Tell me about Ken');
  const limited = await post(question);
  assert.equal(limited.status, 429);
  const notice = await limited.json();
  assert.equal(notice.code, 'CHAT_DAILY_LIMIT');
  assert.match(notice.error, /daily usage limit/);
  assert.equal(limited.headers.get('retry-after'), String(notice.retryAfterSeconds));
  assert.ok(notice.retryAfterSeconds > 0 && notice.retryAfterSeconds <= 86400);
  assert.equal(calls.length, 1);
});

test('chat pauses provider requests when the provider rejects its credentials', async t => {
  let calls = 0;
  const client = { chat: { completions: { create: async () => {
    calls += 1;
    throw Object.assign(new Error('provider rejected key'), { status: 401 });
  } } } };
  const url = await serveChat(t, createChatApp({ client, model: 'test', systemPrompt: 'test' }));
  const post = () => fetch(url, {
    method: 'POST',
    headers: { Origin: 'https://acd-ken.github.io', 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Tell me about Ken' }] }),
  });
  assert.equal((await post()).status, 502);
  assert.equal((await post()).status, 503);
  assert.equal(calls, 1);
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
