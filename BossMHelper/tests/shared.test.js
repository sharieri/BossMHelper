const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTemplate,
  canWriteDraft,
  addExclusion,
  removeExclusion,
  isUnreadFollowUpEligible,
} = require('../shared.js');

test('normalizeTemplate trims a usable template and rejects blank text', () => {
  assert.equal(normalizeTemplate('  您好  '), '您好');
  assert.equal(normalizeTemplate(' \n\t '), '');
});

test('canWriteDraft refuses to overwrite a non-empty composer draft', () => {
  assert.equal(canWriteDraft('', 'Hello'), true);
  assert.equal(canWriteDraft('  ', 'Hello'), true);
  assert.equal(canWriteDraft('Existing draft', 'Hello'), false);
});

test('addExclusion stores each conversation key only once', () => {
  const first = addExclusion([], { key: '张三|前端开发', label: '张三 · 前端开发' });
  const second = addExclusion(first, { key: '张三|前端开发', label: '张三 · 前端开发' });
  assert.deepEqual(second, [{ key: '张三|前端开发', label: '张三 · 前端开发' }]);
});

test('removeExclusion removes only the chosen conversation key', () => {
  const list = [
    { key: '张三|前端开发', label: '张三 · 前端开发' },
    { key: '李四|产品经理', label: '李四 · 产品经理' },
  ];
  assert.deepEqual(removeExclusion(list, '张三|前端开发'), [list[1]]);
});

test('isUnreadFollowUpEligible needs an outgoing read final message and no reply', () => {
  assert.equal(isUnreadFollowUpEligible({ isOutgoing: true, isRead: true, hasReplyAfter: false }), true);
  assert.equal(isUnreadFollowUpEligible({ isOutgoing: false, isRead: true, hasReplyAfter: false }), false);
  assert.equal(isUnreadFollowUpEligible({ isOutgoing: true, isRead: false, hasReplyAfter: false }), false);
  assert.equal(isUnreadFollowUpEligible({ isOutgoing: true, isRead: true, hasReplyAfter: true }), false);
});
