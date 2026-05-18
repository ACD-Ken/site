const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  classifyIntent,
  retrieveKnowledge,
  buildKnowledgeContext,
  getRemovedProjectReply,
  shouldBlockRemovedProjectQuery,
  KNOWLEDGE_BASE,
} = require('../chatbot-knowledge');

test('classifyIntent recognises hiring and collaboration enquiries', () => {
  assert.equal(classifyIntent('Can I hire Ken for an automation project?'), 'hiring');
  assert.equal(classifyIntent('How do I contact Ken about consulting?'), 'hiring');
});

test('classifyIntent recognises portfolio project questions', () => {
  assert.equal(classifyIntent('Tell me about Ken projects'), 'projects');
  assert.equal(classifyIntent('How does ACD-Bot work?'), 'projects');
  assert.equal(classifyIntent('Tell me about the HR Agentic Agent'), 'projects');
});

test('retrieveKnowledge returns project-specific context for project questions', () => {
  const results = retrieveKnowledge('Tell me about the Lucky7 TOTO AI project');

  assert.equal(results[0].id, 'project-lucky7');
  assert.match(results[0].content, /React Native/);
  assert.match(results[0].content, /DeepSeek/);
});

test('retrieveKnowledge includes HR Agent V2 roadmap context', () => {
  const results = retrieveKnowledge('HR Agentic Agent V3 V4 roadmap');
  const hrAgent = results.find((entry) => entry.id === 'project-hr-agent');

  assert.ok(hrAgent);
  assert.match(hrAgent.content, /completed V2 capstone workflow/);
  assert.match(hrAgent.content, /V3 is planned/);
  assert.match(hrAgent.content, /V4 is planned/);
});

test('retrieveKnowledge includes ACD-Bot architecture context', () => {
  const results = retrieveKnowledge('Explain ACD-Bot Railway OpenAI guardrails');
  const acdBot = results.find((entry) => entry.id === 'project-acd-bot');

  assert.ok(acdBot);
  assert.match(acdBot.content, /Phase 1 RAG-assisted portfolio assistant/);
  assert.match(acdBot.content, /Railway backend/);
  assert.match(acdBot.content, /privacy\/scope guardrails/);
});

test('knowledge context does not mention removed TikTok AI project', () => {
  const context = buildKnowledgeContext('Tell me about Ken projects');

  assert.doesNotMatch(context, /tiktok/i);
});

test('runtime bot sources do not include removed project facts', () => {
  const context = buildKnowledgeContext('Tell me about Ken projects, RAG bots, and TikTok automation');
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const searchableKnowledge = JSON.stringify(KNOWLEDGE_BASE);

  for (const source of [context, serverSource, searchableKnowledge]) {
    assert.doesNotMatch(source, /ai\s*tiktok/i);
    assert.doesNotMatch(source, /tiktok\s*creator/i);
    assert.doesNotMatch(source, /custsagent/i);
    assert.doesNotMatch(source, /rag-based customer support bot/i);
  }
});

test('removed project queries are blocked before model generation', () => {
  const reply = getRemovedProjectReply();

  for (const query of [
    'Tell me about AI TikTok Creator',
    'What was the TikTok video automation pipeline?',
    'Can you describe CustSAgent?',
  ]) {
    assert.equal(shouldBlockRemovedProjectQuery(query), true);
  }

  assert.equal(shouldBlockRemovedProjectQuery('Tell me about Lucky7 TOTO AI'), false);
  assert.doesNotMatch(reply, /ai\s*tiktok/i);
  assert.doesNotMatch(reply, /tiktok\s*creator/i);
  assert.doesNotMatch(reply, /custsagent/i);
  assert.match(reply, /current portfolio/i);
});

test('buildKnowledgeContext formats intent and retrieved facts for the model', () => {
  const context = buildKnowledgeContext('What advertising experience does Ken have?');

  assert.match(context, /Visitor intent: work_history/);
  assert.match(context, /M&C Saatchi/);
  assert.match(context, /TBWA/);
  assert.match(context, /Use these facts as the primary source/);
});
