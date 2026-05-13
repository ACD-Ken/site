const test = require('node:test');
const assert = require('node:assert/strict');
const { formatBotReply } = require('../reply-format');

test('formatBotReply removes markdown decoration while keeping readable bullets', () => {
  const input = [
    '**Ken advertising experience:**',
    '',
    '- Worked at **M&C Saatchi** from 2001-2006.',
    '- Built `DAM` workflows for creative teams.',
    '- See [portfolio](https://acd-ken.github.io/site).',
  ].join('\n');

  assert.equal(
    formatBotReply(input),
    [
      'Ken advertising experience:',
      '',
      '- Worked at M&C Saatchi from 2001-2006.',
      '- Built DAM workflows for creative teams.',
      '- See portfolio.',
    ].join('\n')
  );
});
