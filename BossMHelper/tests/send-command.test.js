const test = require('node:test');
const assert = require('node:assert/strict');
const { enterCommand } = require('../send-command.js');

test('enterCommand represents the BOSS Enter send key', () => {
  assert.deepEqual(enterCommand(), { key: 'Enter', code: 'Enter', keyCode: 13 });
});
