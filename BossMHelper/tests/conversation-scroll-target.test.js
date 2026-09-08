const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseConversationScrollTarget } = require('../conversation-scroll-target.js');

test('chooseConversationScrollTarget prioritises the scrollable BOSS user list', () => {
  const outer = { className: 'chat-content', scrollHeight: 644, clientHeight: 644 };
  const userList = { className: 'user-list-content', scrollHeight: 7842, clientHeight: 644 };
  assert.equal(chooseConversationScrollTarget([outer, userList]), userList);
});
