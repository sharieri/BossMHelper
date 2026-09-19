const test = require('node:test');
const assert = require('node:assert/strict');
const { conversationIdentity, conversationTarget, conversationKey, uniqueConversationTargets, hasSelectedConversationClass, shouldRescanConversation, centeredConversationScrollTop } = require('../conversation-target.js');

test('conversationIdentity uses the stable first line instead of the changing message preview', () => {
  assert.equal(conversationIdentity('林女士  我爱我家集团  我爱我家人事 15:00\n[送达]不可以'), '林女士 我爱我家集团 我爱我家人事');
});

test('conversationTarget retains only serializable identity and scroll position', () => {
  const target = conversationTarget({ key: 'chat-9', label: '林女士', item: { stale: true } }, 720);
  assert.deepEqual(target, { key: 'chat-9', label: '林女士', scrollTop: 720 });
  assert.equal('item' in target, false);
});

test('hasSelectedConversationClass recognises the BOSS selected card class', () => {
  assert.equal(hasSelectedConversationClass('friend-content selected'), true);
  assert.equal(hasSelectedConversationClass('friend-content'), false);
  assert.equal(hasSelectedConversationClass('item preselected'), false);
});

test('conversationKey prioritises BOSS name-box text over the changing time fallback', () => {
  assert.equal(conversationKey('', 'Recruiter A Example Company | HR', '11:20'), 'Recruiter A Example Company | HR');
  assert.equal(conversationKey('server-id-7', 'Recruiter A Example Company | HR', '11:20'), 'server-id-7');
});

test('uniqueConversationTargets keeps distinct preview targets in their visible order', () => {
  const entries = [{ key: 'A' }, { key: 'B' }, { key: 'A' }, { key: 'C' }];
  assert.deepEqual(uniqueConversationTargets(entries, 3), [{ key: 'A' }, { key: 'B' }, { key: 'C' }]);
});

test('shouldRescanConversation detects a target displaced from its recorded viewport by list reordering', () => {
  const target = { key: 'Recruiter B | Company | HR', scrollTop: 1560 };
  assert.equal(shouldRescanConversation(target, [{ key: 'Recruiter A | Company | HR' }]), true);
  assert.equal(shouldRescanConversation(target, [{ key: target.key }]), false);
});

test('centeredConversationScrollTop keeps the native left list focused on the current row', () => {
  assert.equal(centeredConversationScrollTop({
    scrollTop: 100,
    scrollHeight: 2000,
    clientHeight: 500,
    containerTop: 100,
    rowTop: 900,
    rowHeight: 80
  }), 690);
  assert.equal(centeredConversationScrollTop({
    scrollTop: 100,
    scrollHeight: 800,
    clientHeight: 500,
    containerTop: 100,
    rowTop: 110,
    rowHeight: 80
  }), 0);
  assert.equal(centeredConversationScrollTop({
    scrollTop: 100,
    scrollHeight: 800,
    clientHeight: 500,
    containerTop: 100,
    rowTop: 790,
    rowHeight: 80
  }), 300);
});
