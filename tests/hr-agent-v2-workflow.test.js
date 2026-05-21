const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_PATH = path.join(__dirname, '..', 'content', 'hr-agent', '05_HR_Agent_v2.json');

test('HR Agent public workflow artifact stays on the single V2 identity', () => {
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const formNode = workflow.nodes.find((node) => node.name === 'Form: Job Application');
  const extractNode = workflow.nodes.find((node) => node.name === 'Extract Form Data');

  assert.equal(workflow.name, '05 HR Agent v2 - Auditable Agentic Screening');
  assert.ok(formNode);
  assert.equal(formNode.type, 'n8n-nodes-base.formTrigger');
  assert.equal(formNode.typeVersion, 2.2);
  assert.equal(formNode.webhookId, undefined);
  assert.deepEqual(
    formNode.parameters.formFields.values.map((field) => field.fieldLabel),
    ['Full Name', 'Email', 'Phone', 'Job Role Applied', 'CV (PDF)'],
  );
  assert.match(extractNode.parameters.jsCode, /Full Name/);
});

test('n8n demo URL is only a compatibility redirect to the V2 page', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'n8n-demo', 'index.html'), 'utf8');

  assert.match(html, /url=\.\.\/hr-agent-v2\.html/);
  assert.match(html, /HR Agent V2/);
  assert.doesNotMatch(html, /V2\.1/);
  assert.doesNotMatch(html, /Live Demo/);
  assert.doesNotMatch(html, /Submit CV/);
  assert.doesNotMatch(html, /05_HR_Agent_v2_1/);
});

test('HR Agent V2 no longer depends on the temporary Railway upload proxy', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.doesNotMatch(server, /HR_AGENT_V2_1_WEBHOOK_URL/);
  assert.doesNotMatch(server, /\/api\/hr-agent-v2-1/);
  assert.doesNotMatch(server, /ngrok-skip-browser-warning/);
});
