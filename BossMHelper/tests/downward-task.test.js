const test = require('node:test');
const assert = require('node:assert/strict');

const {
  POST_SEND_DELAY_MS,
  MAX_SUCCESSOR_SCROLL_ATTEMPTS,
  downwardSuccessorStep,
  nextDownwardTarget,
  uniqueVisibleEntries,
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

test('keeps visible entries unique while preserving order', () => {
  const withDuplicate = [
    { key: 'A', name: 'first' },
    { key: 'A', name: 'first duplicate' },
    { key: '', name: 'missing key' },
    { key: 'B', name: 'next' },
  ];

  assert.deepEqual(uniqueVisibleEntries(withDuplicate), [withDuplicate[0], withDuplicate[3]]);
});

test('uses the visible successor before requesting any downward scroll', () => {
  const step = downwardSuccessorStep({
    entries,
    currentKey: 'B',
    processedKeys: new Set(['B']),
    scrollTop: 120,
    scrollHeight: 1000,
    clientHeight: 300,
    scrollAttempts: 3,
  });

  assert.equal(step.type, 'target');
  assert.deepEqual(step.target, entries[2]);
  assert.equal(step.scrollAttempts, 0);
});

test('requests one bounded downward scroll only when no successor is visible', () => {
  const step = downwardSuccessorStep({
    entries: entries.slice(0, 2),
    currentKey: 'B',
    processedKeys: new Set(['B']),
    scrollTop: 120,
    scrollHeight: 1000,
    clientHeight: 300,
    scrollAttempts: 1,
  });

  assert.equal(step.type, 'scroll');
  assert.equal(step.scrollTop, 340);
  assert.equal(step.scrollAttempts, 2);
});

test('uses the first unprocessed visible entry after the successor lock scrolls past the anchor', () => {
  const step = downwardSuccessorStep({
    entries: entries.slice(2),
    currentKey: 'B',
    processedKeys: new Set(['B']),
    scrollTop: 340,
    scrollHeight: 1000,
    clientHeight: 300,
    scrollAttempts: 1,
  });

  assert.equal(step.type, 'target');
  assert.deepEqual(step.target, entries[2]);
  assert.equal(step.scrollAttempts, 0);
});

test('ends safely when the successor lock cannot advance', () => {
  assert.deepEqual(
    downwardSuccessorStep({
      entries: entries.slice(0, 2),
      currentKey: 'B',
      processedKeys: new Set(['B']),
      scrollTop: 700,
      scrollHeight: 1000,
      clientHeight: 300,
      scrollAttempts: 0,
    }),
    { type: 'complete', reason: 'bottom' },
  );

  assert.deepEqual(
    downwardSuccessorStep({
      entries: entries.slice(0, 2),
      currentKey: 'B',
      processedKeys: new Set(['B']),
      scrollTop: 120,
      scrollHeight: 1000,
      clientHeight: 300,
      scrollAttempts: MAX_SUCCESSOR_SCROLL_ATTEMPTS,
    }),
    { type: 'complete', reason: 'scroll-limit' },
  );
});

test('returns null at the bottom or when the current conversation is missing', () => {
  assert.equal(nextDownwardTarget(entries, 'D', new Set(['D'])), null);
  assert.equal(nextDownwardTarget(entries, 'missing', new Set()), null);
});

test('uses a 300ms delay after a successful send', () => {
  assert.equal(POST_SEND_DELAY_MS, 300);
});
