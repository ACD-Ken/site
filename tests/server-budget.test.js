const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createChatResponder } = require('../server');

function tempLedgerPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-server-budget-'));
  return path.join(dir, 'usage.json');
}

test('chat responder returns budget message without calling OpenAI when cap is reached', async () => {
  const ledgerPath = tempLedgerPath();
  fs.writeFileSync(ledgerPath, JSON.stringify({
    months: {
      '2026-05': {
        spent_usd: 5,
        request_count: 10,
        input_tokens: 1000,
        cached_input_tokens: 0,
        output_tokens: 1000,
        models: {},
      },
    },
  }));
  let openAiCalled = false;
  const respond = createChatResponder({
    budgetOptions: {
      budgetUsd: 5,
      reserveUsd: 0.02,
      ledgerPath,
      now: () => new Date('2026-05-19T00:00:00Z'),
    },
    createOpenAIClient: () => {
      openAiCalled = true;
      return {};
    },
  });

  const result = await respond({
    messages: [{ role: 'user', content: 'Tell me about Ken projects' }],
  });

  assert.equal(result.status, 200);
  assert.match(result.body.reply, /monthly AI budget/i);
  assert.equal(openAiCalled, false);
});

test('chat responder records usage after a successful OpenAI reply', async () => {
  const ledgerPath = tempLedgerPath();
  const respond = createChatResponder({
    budgetOptions: {
      budgetUsd: 5,
      reserveUsd: 0.02,
      ledgerPath,
      now: () => new Date('2026-05-19T00:00:00Z'),
      pricing: {
        inputUsdPer1M: 10,
        cachedInputUsdPer1M: 1,
        outputUsdPer1M: 20,
      },
    },
    createOpenAIClient: () => ({
      chat: {
        completions: {
          create: async () => ({
            model: 'gpt-test',
            usage: {
              prompt_tokens: 1000,
              prompt_tokens_details: { cached_tokens: 250 },
              completion_tokens: 500,
            },
            choices: [{ message: { content: '- Hello from ACD-Bot' } }],
          }),
        },
      },
    }),
  });

  const result = await respond({
    messages: [{ role: 'user', content: 'Hello' }],
  });

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const month = ledger.months['2026-05'];

  assert.equal(result.status, 200);
  assert.equal(result.body.reply, '- Hello from ACD-Bot');
  assert.equal(month.request_count, 1);
  assert.equal(month.spent_usd, 0.01775);
  assert.equal(month.models['gpt-test'].request_count, 1);
});
