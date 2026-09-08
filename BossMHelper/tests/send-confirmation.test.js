const test = require('node:test');
const assert = require('node:assert/strict');
const { isSendConfirmed } = require('../send-confirmation.js');

test('isSendConfirmed accepts a cleared editor after sending', () => {
  assert.equal(isSendConfirmed({ editorText: '', newestMessageText: '', template: '您好' }), true);
});

test('isSendConfirmed accepts a newly visible outgoing template', () => {
  assert.equal(isSendConfirmed({ editorText: '您好', newestMessageText: '您好', template: '您好' }), true);
});

test('isSendConfirmed rejects an unchanged editor without a matching new message', () => {
  assert.equal(isSendConfirmed({ editorText: '您好', newestMessageText: '请发简历', template: '您好' }), false);
});
