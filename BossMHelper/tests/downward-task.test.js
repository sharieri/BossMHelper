const test = require('node:test');
const assert = require('node:assert/strict');

const {
  POST_SEND_DELAY_MS,
  nextDownwardTarget,
} = require('../downward-task.js');

const entries = [
  { key: 'A', name: 'first' },
  { key: 'B', name: 'selected' },
  { key: 'C', name: 'next' },
  { key: 'D', name: 'last' },
];

test('includes the selected conversation as the first downward target', () => {
  assert.deepEqual(nextDownwardTarget(entries, 'B', new Set()), entries[1]);
});

test('returns the first unprocessed conversation below the current target', () => {
  assert.deepEqual(nextDownwardTarget(entries, 'B', new Set(['B'])), entries[2]);
});

test('skips duplicate keys and already processed conversations', () => {
  const withDuplicate = [
    { key: 'B', name: 'selected duplicate' },
    { key: 'C', name: 'next' },
    { key: 'C', name: 'next duplicate' },
    { key: 'D', name: 'last' },
  ];

  assert.deepEqual(
    nextDownwardTarget(withDuplicate, 'B', new Set(['B', 'C'])),
    withDuplicate[3],
  );
});

test('returns null at the bottom or when the current conversation is missing', () => {
  assert.equal(nextDownwardTarget(entries, 'D', new Set(['D'])), null);
  assert.equal(nextDownwardTarget(entries, 'missing', new Set()), null);
});

test('uses a 300ms delay after a successful send', () => {
  assert.equal(POST_SEND_DELAY_MS, 300);
});
