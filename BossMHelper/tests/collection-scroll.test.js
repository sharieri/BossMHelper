const test = require('node:test');
const assert = require('node:assert/strict');
const { nextCollectionScrollTop } = require('../collection-scroll.js');

test('nextCollectionScrollTop advances within a long virtualised list', () => {
  assert.equal(nextCollectionScrollTop(0, 7842, 644), 464);
});

test('nextCollectionScrollTop stays at the true bottom', () => {
  assert.equal(nextCollectionScrollTop(7198, 7842, 644), 7198);
});
