const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldUseEditableCommand } = require('../editor-write.js');

test('shouldUseEditableCommand uses the command path only for a visible contenteditable editor', () => {
  assert.equal(shouldUseEditableCommand({ isContentEditable: true, visible: true }), true);
  assert.equal(shouldUseEditableCommand({ isContentEditable: false, visible: true }), false);
  assert.equal(shouldUseEditableCommand({ isContentEditable: true, visible: false }), false);
});
