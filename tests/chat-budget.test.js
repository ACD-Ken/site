const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createChatBudget } = require('../chat-budget');

const minute = 60_000;
const day = 1440 * minute;

test('rolling quotas survive restarts and release capacity as attempts expire', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-chat-budget-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let time = day;
  const options = { directory, now: () => time, burstLimit: 1, dailyLimit: 2, monthlyLimit: 3 };
  const budget = createChatBudget(options);
  assert.equal(budget.reserve(), null);

  const restarted = createChatBudget(options);
  assert.deepEqual(restarted.reserve(), { code: 'CHAT_BURST_LIMIT', retryAfterSeconds: 900 });
  time += 15 * minute;
  assert.equal(restarted.reserve(), null);
  assert.deepEqual(restarted.reserve(), { code: 'CHAT_DAILY_LIMIT', retryAfterSeconds: 85500 });
  time = 2 * day;
  assert.equal(restarted.reserve(), null);
  assert.deepEqual(restarted.reserve(), { code: 'CHAT_MONTHLY_LIMIT', retryAfterSeconds: 29 * 86400 });
  time = 31 * day;
  assert.equal(createChatBudget(options).reserve(), null);
});

test('the quota fails closed when persisted usage cannot be read or written', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-chat-budget-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'acd-chat-attempts.json');
  fs.writeFileSync(filename, '{"unexpected":"data"}');
  assert.throws(() => createChatBudget({ directory }), /Invalid chat budget data/);
  fs.unlinkSync(filename);
  const budget = createChatBudget({ directory });
  fs.rmdirSync(directory);
  assert.throws(() => budget.reserve(), { code: 'ENOENT' });
});
