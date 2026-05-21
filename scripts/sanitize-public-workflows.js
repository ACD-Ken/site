const fs = require('node:fs');
const path = require('node:path');

const workflowFiles = [
  'content/hr-agent/05_HR_Agent_v2.json',
  'content/hr-agent/05_HR_Agent_v3.json',
  'content/hr-agent/05_HR_Agent_v4.json',
  'content/inventory-agent/04-inventory-agent-v2.json',
  'content/inventory-agent/04-inventory-agent-v3.json',
  'content/inventory-agent/supplier-email-smoke-test.json',
  'content/m7-client-lead-agent/customer-rapport-assistant.json',
  'content/m7-client-lead-agent/rag-knowledge-ingestion.json',
  'content/m7-client-lead-agent/telegram-lead-qualification-bot.json',
];

const replacements = [
  [/alsocando@gmail\.com/gi, 'recruiter@example.com'],
  [/dmsgbox@gmail\.com/gi, 'supplier@example.com'],
  [/data\.msgbox@gmail\.com/gi, 'warehouse@example.com'],
  [/https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit(?:\?usp=drivesdk|#gid=\d+)?/g, 'SANITIZED_GOOGLE_SHEET_URL'],
  [/1sLA9GWGhDHy3HNDizeEWe9YcwzdV7UVCn5TO473Op_c/g, 'SANITIZED_HR_SHEET_ID'],
  [/1VQrdLA0JSfCWaAhPE31ri7Ovj2SDcO6_GQLuJi8B9ZI/g, 'SANITIZED_INVENTORY_SHEET_ID'],
  [/https:\/\/natalee-rightable-unblissfully\.ngrok-free\.dev/gi, 'SANITIZED_N8N_PUBLIC_BASE_URL'],
  [/@AlsoCan_Bot/g, '@ExampleLeadBot'],
  [/\b\d{8,12}:AA[A-Za-z0-9_-]{30,}\b/g, 'SANITIZED_TELEGRAM_BOT_TOKEN'],
];

function sanitizeString(value) {
  return replacements.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value);
}

function sanitize(value) {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, entry] of Object.entries(value)) {
      if (
        key === 'credentials'
        || key === 'webhookId'
        || key === 'cachedResultUrl'
        || key === 'publicWebhookBase'
        || key === 'publicWebhookPath'
        || key === 'instanceId'
      ) {
        continue;
      }

      clean[key] = sanitize(entry);
    }

    if (clean.type === 'n8n-nodes-base.googleSheets' && clean.parameters?.documentId) {
      clean.parameters.documentId.cachedResultName = 'Sanitized portfolio sheet';
    }

    return clean;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  return value;
}

for (const relativePath of workflowFiles) {
  const filePath = path.join(__dirname, '..', relativePath);
  const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const sanitized = sanitize(workflow);
  fs.writeFileSync(filePath, `${JSON.stringify(sanitized, null, 2)}\n`);
  console.log(`sanitized ${relativePath}`);
}
