const test = require('node:test');
const assert = require('node:assert/strict');
const { nextTaskAction } = require('../task-runner.js');

test('nextTaskAction skips an excluded conversation', () => {
  assert.deepEqual(nextTaskAction({ key: 'A' }, new Set(['A'])), { type: 'skip' });
});

test('nextTaskAction sends an included conversation', () => {
  assert.deepEqual(nextTaskAction({ key: 'B' }, new Set(['A'])), { type: 'send' });
});
