const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_WORKFLOW_FILES = [
  'content/hr-agent/05_HR_Agent_v2.json',
  'content/hr-agent/05_HR_Agent_v2_1.json',
  'content/hr-agent/05_HR_Agent_v3.json',
  'content/hr-agent/05_HR_Agent_v4.json',
  'content/inventory-agent/04-inventory-agent-v2.json',
  'content/inventory-agent/04-inventory-agent-v3.json',
  'content/inventory-agent/supplier-email-smoke-test.json',
];

const FORBIDDEN_TEXT_PATTERNS = [
  /alsocando@gmail\.com/i,
  /dmsgbox@gmail\.com/i,
  /data\.msgbox@gmail\.com/i,
  /docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+/i,
  /1sLA9GWGhDHy3HNDizeEWe9YcwzdV7UVCn5TO473Op_c/,
  /1VQrdLA0JSfCWaAhPE31ri7Ovj2SDcO6_GQLuJi8B9ZI/,
  /natalee-rightable-unblissfully\.ngrok-free\.dev/i,
  /sk-[A-Za-z0-9_-]{20,}/,
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
