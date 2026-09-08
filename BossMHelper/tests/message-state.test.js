const test = require('node:test');
const assert = require('node:assert/strict');
const { messageStateFromRows } = require('../message-state.js');

test('messageStateFromRows accepts a final self message marked read', () => {
  assert.deepEqual(messageStateFromRows([
    { className: 'message-item item-friend', statusClassNames: [] },
    { className: 'message-item item-myself', statusClassNames: ['message-status status-read'] }
  ]), { isOutgoing: true, isRead: true, hasReplyAfter: false });
});

test('messageStateFromRows rejects a recruiter reply after a read self message', () => {
  assert.deepEqual(messageStateFromRows([
    { className: 'message-item item-myself', statusClassNames: ['message-status status-read'] },
    { className: 'message-item item-friend', statusClassNames: [] }
  ]), { isOutgoing: false, isRead: false, hasReplyAfter: true });
});

test('messageStateFromRows rejects a final self message that is only delivered', () => {
  assert.deepEqual(messageStateFromRows([
    { className: 'message-item item-myself', statusClassNames: ['message-status status-delivery'] }
  ]), { isOutgoing: true, isRead: false, hasReplyAfter: false });
});
