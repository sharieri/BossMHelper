const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseMessageContainer } = require('../message-container-target.js');

test('chooseMessageContainer ignores the narrow contact-list preview and selects the central chat pane', () => {
  const contactList = { id: 'contact-list', left: 128, top: 161, width: 364, height: 644 };
  const chatPane = { id: 'chat-pane', left: 636, top: 161, width: 1236, height: 646 };
  const editor = { left: 700, top: 807, width: 1100, height: 79 };

  assert.equal(chooseMessageContainer([contactList, chatPane], editor), chatPane);
});

test('chooseMessageContainer returns null when no visible candidate is in the editor column', () => {
  const contactList = { id: 'contact-list', left: 128, top: 161, width: 364, height: 644 };
  const editor = { left: 700, top: 807, width: 1100, height: 79 };

  assert.equal(chooseMessageContainer([contactList], editor), null);
});
