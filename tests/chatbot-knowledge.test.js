const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyIntent,
  retrieveKnowledge,
  buildKnowledgeContext,
} = require('../chatbot-knowledge');

test('classifyIntent recognises hiring and collaboration enquiries', () => {
  assert.equal(classifyIntent('Can I hire Ken for an automation project?'), 'hiring');
  assert.equal(classifyIntent('How do I contact Ken about consulting?'), 'hiring');
});

test('classifyIntent recognises portfolio project questions', () => {
  assert.equal(classifyIntent('Tell me about Ken projects'), 'projects');
});

test('retrieveKnowledge returns project-specific context for project questions', () => {
  const results = retrieveKnowledge('Tell me about the Lucky7 TOTO AI project');

  assert.equal(results[0].id, 'project-lucky7');
  assert.match(results[0].content, /React Native/);
  assert.match(results[0].content, /DeepSeek/);
});

test('buildKnowledgeContext formats intent and retrieved facts for the model', () => {
  const context = buildKnowledgeContext('What advertising experience does Ken have?');

  assert.match(context, /Visitor intent: work_history/);
  assert.match(context, /M&C Saatchi/);
  assert.match(context, /TBWA/);
  assert.match(context, /Use these facts as the primary source/);
});
