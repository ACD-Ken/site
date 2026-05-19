const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_BUDGET_USD = 5;
const DEFAULT_RESERVE_USD = 0.02;
const DEFAULT_LEDGER_PATH = path.join(os.tmpdir(), 'acd-bot-openai-usage.json');

const DEFAULT_PRICING = {
  inputUsdPer1M: 5,
  cachedInputUsdPer1M: 5,
  outputUsdPer1M: 20,
};

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getBudgetConfigFromEnv() {
  return {
    budgetUsd: numberFromEnv('ACD_BOT_MONTHLY_BUDGET_USD', DEFAULT_BUDGET_USD),
    reserveUsd: numberFromEnv('ACD_BOT_REQUEST_COST_RESERVE_USD', DEFAULT_RESERVE_USD),
    ledgerPath: process.env.ACD_BOT_USAGE_LEDGER_PATH || DEFAULT_LEDGER_PATH,
    pricing: {
      inputUsdPer1M: numberFromEnv('ACD_BOT_PRICE_INPUT_USD_PER_1M', DEFAULT_PRICING.inputUsdPer1M),
      cachedInputUsdPer1M: numberFromEnv('ACD_BOT_PRICE_CACHED_INPUT_USD_PER_1M', DEFAULT_PRICING.cachedInputUsdPer1M),
      outputUsdPer1M: numberFromEnv('ACD_BOT_PRICE_OUTPUT_USD_PER_1M', DEFAULT_PRICING.outputUsdPer1M),
    },
  };
}

function currentUtcMonth(now = () => new Date()) {
  return now().toISOString().slice(0, 7);
}

function roundUsd(value) {
  return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
}

function emptyLedger() {
  return { months: {} };
}

function normalizeMonth(month = {}) {
  return {
    spent_usd: Number(month.spent_usd) || 0,
    request_count: Number(month.request_count) || 0,
    input_tokens: Number(month.input_tokens) || 0,
    cached_input_tokens: Number(month.cached_input_tokens) || 0,
    output_tokens: Number(month.output_tokens) || 0,
    models: month.models && typeof month.models === 'object' ? month.models : {},
  };
}

function normalizeLedger(ledger = {}) {
  const months = {};
  for (const [month, value] of Object.entries(ledger.months || {})) {
    months[month] = normalizeMonth(value);
  }
  return { months };
}

function ensureMonth(ledger, month) {
  if (!ledger.months[month]) {
    ledger.months[month] = normalizeMonth();
  }
  return ledger.months[month];
}

function readLedger(ledgerPath) {
  try {
    const raw = fs.readFileSync(ledgerPath, 'utf8');
    return normalizeLedger(JSON.parse(raw));
  } catch (err) {
    if (err.code === 'ENOENT') return emptyLedger();
    throw err;
  }
}

function writeLedger(ledgerPath, ledger) {
  const directory = path.dirname(ledgerPath);
  fs.mkdirSync(directory, { recursive: true });
  const tempPath = path.join(directory, `.${path.basename(ledgerPath)}.${process.pid}.tmp`);
  fs.writeFileSync(tempPath, JSON.stringify(normalizeLedger(ledger), null, 2));
  fs.renameSync(tempPath, ledgerPath);
}

function getBudgetReachedReply() {
  return [
    'ACD-Bot has reached the monthly AI budget.',
    '',
    '- Please contact Ken by email or LinkedIn for anything urgent.',
    '- The chat budget resets automatically next month.',
  ].join('\n');
}

function estimateOpenAiCostUsd({ usage = {}, pricing = DEFAULT_PRICING }) {
  const inputTokens = Number(usage.prompt_tokens) || 0;
  const outputTokens = Number(usage.completion_tokens) || 0;
  const cachedTokens = Math.min(
    Number(usage.prompt_tokens_details?.cached_tokens) || 0,
    inputTokens
  );
  const uncachedTokens = Math.max(inputTokens - cachedTokens, 0);

  return roundUsd(
    (uncachedTokens / 1000000) * pricing.inputUsdPer1M +
    (cachedTokens / 1000000) * pricing.cachedInputUsdPer1M +
    (outputTokens / 1000000) * pricing.outputUsdPer1M
  );
}

function createOpenAiBudgetGuard(options = {}) {
  const envConfig = getBudgetConfigFromEnv();
  const budgetUsd = options.budgetUsd ?? envConfig.budgetUsd;
  const reserveUsd = options.reserveUsd ?? envConfig.reserveUsd;
  const ledgerPath = options.ledgerPath || envConfig.ledgerPath;
  const pricing = { ...envConfig.pricing, ...(options.pricing || {}) };
  const now = options.now || (() => new Date());

  function checkBudget() {
    const month = currentUtcMonth(now);
    try {
      const ledger = readLedger(ledgerPath);
      const monthLedger = ensureMonth(ledger, month);
      writeLedger(ledgerPath, ledger);
      const spentUsd = roundUsd(monthLedger.spent_usd);

      if (spentUsd + reserveUsd > budgetUsd) {
        return {
          allowed: false,
          reason: 'monthly_budget_reached',
          month,
          spentUsd,
          budgetUsd,
          reserveUsd,
        };
      }

      return { allowed: true, month, spentUsd, budgetUsd, reserveUsd };
    } catch (err) {
      return {
        allowed: false,
        reason: 'ledger_unavailable',
        month,
        spentUsd: null,
        budgetUsd,
        reserveUsd,
        error: err.message,
      };
    }
  }

  function recordUsage({ model = 'unknown', usage = {} } = {}) {
    const month = currentUtcMonth(now);
    const ledger = readLedger(ledgerPath);
    const monthLedger = ensureMonth(ledger, month);
    const modelLedger = normalizeMonth(monthLedger.models[model]);
    const inputTokens = Number(usage.prompt_tokens) || 0;
    const outputTokens = Number(usage.completion_tokens) || 0;
    const cachedTokens = Math.min(
      Number(usage.prompt_tokens_details?.cached_tokens) || 0,
      inputTokens
    );
    const costUsd = estimateOpenAiCostUsd({ usage, pricing });

    monthLedger.spent_usd = roundUsd(monthLedger.spent_usd + costUsd);
    monthLedger.request_count += 1;
    monthLedger.input_tokens += inputTokens;
    monthLedger.cached_input_tokens += cachedTokens;
    monthLedger.output_tokens += outputTokens;

    modelLedger.spent_usd = roundUsd(modelLedger.spent_usd + costUsd);
    modelLedger.request_count += 1;
    modelLedger.input_tokens += inputTokens;
    modelLedger.cached_input_tokens += cachedTokens;
    modelLedger.output_tokens += outputTokens;
    monthLedger.models[model] = modelLedger;

    writeLedger(ledgerPath, ledger);
    return { month, costUsd, spentUsd: monthLedger.spent_usd };
  }

  return {
    budgetUsd,
    reserveUsd,
    ledgerPath,
    pricing,
    checkBudget,
    recordUsage,
  };
}

module.exports = {
  createOpenAiBudgetGuard,
  estimateOpenAiCostUsd,
  getBudgetConfigFromEnv,
  getBudgetReachedReply,
};
