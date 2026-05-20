const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_PATH = path.join(__dirname, '..', 'content', 'hr-agent', '05_HR_Agent_v2_1.json');
const LIVE_WEBHOOK_URL = 'https://natalee-rightable-unblissfully.ngrok-free.dev/webhook/hr-agent-v2-1';
const PUBLIC_PROXY_URL = 'https://acd-bot-production.up.railway.app/api/hr-agent-v2-1';

test('HR Agent V2.1 workflow uses a live webhook entrypoint for website CV submissions', () => {
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const webhookNode = workflow.nodes.find((node) => node.name === 'Webhook: Public CV Submission');
  const extractNode = workflow.nodes.find((node) => node.name === 'Extract Form Data');

  assert.equal(workflow.name, '05 HR Agent v2.1 - Live Website CV Screening');
  assert.ok(webhookNode);
  assert.equal(webhookNode.type, 'n8n-nodes-base.webhook');
  assert.equal(webhookNode.parameters.httpMethod, 'POST');
  assert.equal(webhookNode.parameters.path, 'hr-agent-v2-1');
  assert.match(extractNode.parameters.jsCode, /item\.json\.body/);
  assert.match(extractNode.parameters.jsCode, /Full Name/);
});

test('HR Agent V2.1 website runner posts through the public backend proxy', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'n8n-demo', 'index.html'), 'utf8');

  assert.match(html, /id="hr-agent-live-form"/);
  assert.match(html, /method="post"/);
  assert.match(html, /enctype="multipart\/form-data"/);
  assert.match(html, new RegExp(`action="${PUBLIC_PROXY_URL}"`));
  assert.match(html, new RegExp(`data-n8n-webhook="${LIVE_WEBHOOK_URL}"`));
  assert.match(html, /name="Full Name"/);
  assert.match(html, /name="Email"/);
  assert.match(html, /name="Phone"/);
  assert.match(html, /name="Job Role Applied"/);
  assert.match(html, /name="CV \(PDF\)"/);
  assert.match(html, />Submit CV<\/button>/);
  assert.match(html, /CV submission received\./);
  assert.match(html, /className = `status-message popup visible/);
  assert.doesNotMatch(html, /Submit CV To n8n/);
  assert.doesNotMatch(html, /Sends the PDF through the site backend to n8n\./);
});

test('HR Agent V2.1 backend proxy forwards uploads to ngrok with the browser-warning bypass header', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.match(server, /HR_AGENT_V2_1_WEBHOOK_URL/);
  assert.match(server, /app\.post\('\/api\/hr-agent-v2-1'/);
  assert.match(server, /ngrok-skip-browser-warning/);
  assert.match(server, /duplex:\s*'half'/);
  assert.match(server, /multipart\/form-data/);
  assert.match(server, /CV submission received\./);
});
