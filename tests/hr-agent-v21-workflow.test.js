const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_PATH = path.join(__dirname, '..', 'content', 'hr-agent', '05_HR_Agent_v2_1.json');
const N8N_FORM_URL = 'https://natalee-rightable-unblissfully.ngrok-free.dev/form/c0e1598e-0814-4bcc-b721-8fece67b75c8';

test('HR Agent V2.1 workflow uses an n8n Form Trigger for public CV submissions', () => {
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
  const formNode = workflow.nodes.find((node) => node.name === 'Form: V2.1 CV Submission');
  const extractNode = workflow.nodes.find((node) => node.name === 'Extract Form Data');

  assert.equal(workflow.name, '05 HR Agent v2.1 - n8n Form CV Screening');
  assert.ok(formNode);
  assert.equal(formNode.type, 'n8n-nodes-base.formTrigger');
  assert.equal(formNode.typeVersion, 2.2);
  assert.equal(formNode.webhookId, undefined);
  assert.match(formNode.parameters.formTitle, /HR Agent V2\.1/);
  assert.match(formNode.parameters.formSubmittedText, /CV submission received\./);
  assert.deepEqual(
    formNode.parameters.formFields.values.map((field) => field.fieldLabel),
    ['Full Name', 'Email', 'Phone', 'Job Role Applied', 'CV (PDF)'],
  );
  assert.match(extractNode.parameters.jsCode, /item\.json \|\| \{\}/);
  assert.match(extractNode.parameters.jsCode, /Full Name/);
});

test('HR Agent V2.1 website runner links to the n8n-hosted form without a backend proxy', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'n8n-demo', 'index.html'), 'utf8');

  assert.match(html, new RegExp(`href="${N8N_FORM_URL}"`));
  assert.match(html, /target="_blank"/);
  assert.match(html, />Submit CV<\/a>/);
  assert.match(html, /CV submission received\./);
  assert.match(html, /n8n-hosted Form Trigger/);
  assert.doesNotMatch(html, /id="hr-agent-live-form"/);
  assert.doesNotMatch(html, /acd-bot-production\.up\.railway\.app\/api\/hr-agent-v2-1/);
  assert.doesNotMatch(html, /fetch\(form\.action/);
  assert.doesNotMatch(html, /Submit CV To n8n/);
  assert.doesNotMatch(html, /Sends the PDF through the site backend to n8n\./);
});

test('HR Agent V2.1 no longer depends on the Railway upload proxy', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

  assert.doesNotMatch(server, /HR_AGENT_V2_1_WEBHOOK_URL/);
  assert.doesNotMatch(server, /\/api\/hr-agent-v2-1/);
  assert.doesNotMatch(server, /ngrok-skip-browser-warning/);
});
