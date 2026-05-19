const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  createOpenAiBudgetGuard,
  estimateOpenAiCostUsd,
  getBudgetReachedReply,
} = require('../openai-budget');

function tempLedgerPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acd-budget-'));
  return path.join(dir, 'usage.json');
}

test('budget guard allows requests below the monthly cap', () => {
  const ledgerPath = tempLedgerPath();
  const guard = createOpenAiBudgetGuard({
    budgetUsd: 5,
    reserveUsd: 0.02,
    ledgerPath,
    now: () => new Date('2026-05-19T00:00:00Z'),
  });

  assert.deepEqual(guard.checkBudget(), {
    allowed: true,
    month: '2026-05',
    spentUsd: 0,
    budgetUsd: 5,
    reserveUsd: 0.02,
  });
});

test('budget guard blocks when monthly spend plus reserve exceeds cap', () => {
  const ledgerPath = tempLedgerPath();
  fs.writeFileSync(ledgerPath, JSON.stringify({
    months: {
      '2026-05': {
        spent_usd: 4.99,
        request_count: 12,
        input_tokens: 1000,
        cached_input_tokens: 0,
        output_tokens: 500,
        models: {},
      },
    },
  }));
  const guard = createOpenAiBudgetGuard({
    budgetUsd: 5,
    reserveUsd: 0.02,
    ledgerPath,
    now: () => new Date('2026-05-19T00:00:00Z'),
  });

  const result = guard.checkBudget();

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'monthly_budget_reached');
  assert.equal(result.spentUsd, 4.99);
  assert.match(getBudgetReachedReply(), /monthly AI budget/i);
  assert.match(getBudgetReachedReply(), /email or LinkedIn/i);
});

test('budget guard resets by UTC month', () => {
  const ledgerPath = tempLedgerPath();
  fs.writeFileSync(ledgerPath, JSON.stringify({
    months: {
      '2026-05': {
        spent_usd: 5,
        request_count: 30,
        input_tokens: 1000,
        cached_input_tokens: 0,
        output_tokens: 1000,
        models: {},
      },
    },
  }));
  const guard = createOpenAiBudgetGuard({
    budgetUsd: 5,
    reserveUsd: 0.02,
    ledgerPath,
    now: () => new Date('2026-06-01T00:00:00Z'),
  });

  assert.equal(guard.checkBudget().allowed, true);
  assert.equal(guard.checkBudget().month, '2026-06');
  assert.equal(guard.checkBudget().spentUsd, 0);
});

test('budget guard fails closed when the ledger is corrupt', () => {
  const ledgerPath = tempLedgerPath();
  fs.writeFileSync(ledgerPath, '{not-json');
  const guard = createOpenAiBudgetGuard({
    budgetUsd: 5,
    reserveUsd: 0.02,
    ledgerPath,
    now: () => new Date('2026-05-19T00:00:00Z'),
  });

  const result = guard.checkBudget();

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'ledger_unavailable');
});

test('budget guard records estimated usage by month and model', () => {
  const ledgerPath = tempLedgerPath();
  const guard = createOpenAiBudgetGuard({
    budgetUsd: 5,
    reserveUsd: 0.02,
    ledgerPath,
    now: () => new Date('2026-05-19T00:00:00Z'),
    pricing: {
      inputUsdPer1M: 10,
      cachedInputUsdPer1M: 1,
      outputUsdPer1M: 20,
    },
  });

  guard.recordUsage({
    model: 'gpt-test',
    usage: {
      prompt_tokens: 1000,
      prompt_tokens_details: { cached_tokens: 250 },
      completion_tokens: 500,
    },
  });

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const month = ledger.months['2026-05'];

  assert.equal(month.request_count, 1);
  assert.equal(month.input_tokens, 1000);
  assert.equal(month.cached_input_tokens, 250);
  assert.equal(month.output_tokens, 500);
  assert.equal(month.models['gpt-test'].request_count, 1);
  assert.equal(month.spent_usd, 0.01775);
});

test('estimateOpenAiCostUsd uses uncached input, cached input, and output prices', () => {
  const cost = estimateOpenAiCostUsd({
    usage: {
      prompt_tokens: 1000,
      prompt_tokens_details: { cached_tokens: 400 },
      completion_tokens: 500,
    },
    pricing: {
      inputUsdPer1M: 10,
      cachedInputUsdPer1M: 1,
      outputUsdPer1M: 20,
    },
  });

  assert.equal(cost, 0.0164);
});
