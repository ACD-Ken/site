const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_WORKFLOW_FILES = [
  'content/hr-agent/05_HR_Agent_v2.json',
  'content/hr-agent/05_HR_Agent_v3.json',
  'content/hr-agent/05_HR_Agent_v4.json',
  'content/inventory-agent/04-inventory-agent-v2.json',
  'content/inventory-agent/04-inventory-agent-v3.json',
  'content/inventory-agent/supplier-email-smoke-test.json',
  'content/m7-client-lead-agent/rag-knowledge-ingestion.json',
  'content/m7-client-lead-agent/telegram-lead-qualification-bot.json',
];

const PUBLIC_M7_FILES = [
  ...PUBLIC_WORKFLOW_FILES.filter(file => file.startsWith('content/m7-client-lead-agent/')),
  'content/m7-client-lead-agent/README.md',
  'content/m7-client-lead-agent/test-results-2026-05-22.md',
  'm7-client-lead-agent.html',
];

const PUBLIC_M7_WORKFLOW_FILES = PUBLIC_WORKFLOW_FILES.filter(file => (
  file.startsWith('content/m7-client-lead-agent/')
));

const FORBIDDEN_TEXT_PATTERNS = [
  /alsocando@gmail\.com/i,
  /dmsgbox@gmail\.com/i,
  /data\.msgbox@gmail\.com/i,
  /docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+/i,
  /1sLA9GWGhDHy3HNDizeEWe9YcwzdV7UVCn5TO473Op_c/,
  /1VQrdLA0JSfCWaAhPE31ri7Ovj2SDcO6_GQLuJi8B9ZI/,
  /natalee-rightable-unblissfully\.ngrok-free\.dev/i,
  /@AlsoCan_Bot/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /\b\d{8,12}:AA[A-Za-z0-9_-]{30,}\b/,
  /ya29\.[A-Za-z0-9_-]+/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function walk(value, visitor, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visitor, pathParts.concat(index)));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      visitor(key, entry, pathParts);
      walk(entry, visitor, pathParts.concat(key));
    }
  }
}

test('public n8n workflow JSON artifacts are sanitized for website hosting', () => {
  for (const relativePath of PUBLIC_WORKFLOW_FILES) {
    const absolutePath = path.join(__dirname, '..', relativePath);
    const text = fs.readFileSync(absolutePath, 'utf8');
    const workflow = JSON.parse(text);
    const exposedKeys = [];

    for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
      assert.doesNotMatch(text, pattern, `${relativePath} contains forbidden public metadata: ${pattern}`);
    }

    walk(workflow, (key) => {
      if (
        key === 'credentials'
        || key === 'webhookId'
        || key === 'cachedResultUrl'
        || key === 'publicWebhookBase'
        || key === 'publicWebhookPath'
        || key === 'instanceId'
      ) {
        exposedKeys.push(key);
      }
    });

    assert.deepEqual(exposedKeys, [], `${relativePath} exposes operational n8n metadata`);
  }
});

test('M7 public site files do not expose private E2E artifacts or secrets', () => {
  const root = path.join(__dirname, '..');
  const publicM7Dir = path.join(root, 'content/m7-client-lead-agent');
  const publishedNames = fs.readdirSync(publicM7Dir);

  assert.equal(
    publishedNames.some(name => /local-e2e|synthetic-e2e|test-ready/i.test(name)),
    false,
    'public M7 folder must not publish local E2E or synthetic workflow exports',
  );

  for (const relativePath of PUBLIC_M7_FILES) {
    const text = fs.readFileSync(path.join(root, relativePath), 'utf8');

    for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
      if (relativePath.endsWith('m7-client-lead-agent.html') && pattern.source.includes('@AlsoCan_Bot')) {
        continue;
      }
      assert.doesNotMatch(text, pattern, `${relativePath} contains forbidden public metadata: ${pattern}`);
    }
  }
});

test('M7 public workflow artifacts use sanitized webhook triggers', () => {
  for (const relativePath of PUBLIC_M7_WORKFLOW_FILES) {
    const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
    const triggerNodes = workflow.nodes.filter(node => node.type.endsWith('Trigger') || node.type === 'n8n-nodes-base.webhook');

    assert.equal(
      triggerNodes.some(node => node.type === 'n8n-nodes-base.manualTrigger'),
      false,
      `${relativePath} should not publish manual test triggers`,
    );
    assert.equal(
      triggerNodes[0]?.type,
      'n8n-nodes-base.webhook',
      `${relativePath} should start from a sanitized Webhook trigger`,
    );
    assert.match(
      triggerNodes[0].parameters.path,
      /^SANITIZED_M7_[A-Z_]+_WEBHOOK$/,
      `${relativePath} should not expose a live webhook path`,
    );
  }
});
