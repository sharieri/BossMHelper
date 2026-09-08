const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseVisibleEditor } = require('../editor-target.js');

test('chooseVisibleEditor ignores a hidden textarea in favour of the visible chat editor', () => {
  const hidden = { element: { id: 'hidden' }, width: 0, height: 0, visible: false };
  const visible = { element: { id: 'chat-input' }, width: 752, height: 79, visible: true };
  assert.equal(chooseVisibleEditor([hidden, visible]).id, 'chat-input');
});

test('chooseVisibleEditor chooses the largest visible editor and falls back only when necessary', () => {
  const small = { element: { id: 'small' }, width: 80, height: 30, visible: true };
  const large = { element: { id: 'large' }, width: 500, height: 80, visible: true };
  assert.equal(chooseVisibleEditor([small, large]).id, 'large');
  assert.equal(chooseVisibleEditor([{ element: { id: 'only-hidden' }, width: 0, height: 0, visible: false }]).id, 'only-hidden');
});
