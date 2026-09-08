const test = require('node:test');
const assert = require('node:assert/strict');
const { isBossChatUrl, typeCommands, replaceTypeCommands } = require('../native-send.js');

test('isBossChatUrl permits only the BOSS geek chat page', () => {
  assert.equal(isBossChatUrl('https://www.zhipin.com/web/geek/chat?ka=header-message'), true);
  assert.equal(isBossChatUrl('https://www.zhipin.com/web/chat'), false);
  assert.equal(isBossChatUrl('https://example.com/web/geek/chat'), false);
});

test('typeCommands inserts text without any send key', () => {
  assert.deepEqual(typeCommands('您好'), [
    { method: 'Input.dispatchKeyEvent', params: { type: 'char', text: '您', unmodifiedText: '您' } },
    { method: 'Input.dispatchKeyEvent', params: { type: 'char', text: '好', unmodifiedText: '好' } }
  ]);
});

test('replaceTypeCommands clears the focused editor before typing, without Enter', () => {
  const commands = replaceTypeCommands('您好');
  assert.equal(commands.at(-1).method, 'Input.dispatchKeyEvent');
  assert.equal(commands.at(-1).params.type, 'char');
  assert.equal(commands.some((command) => command.params?.key === 'Enter'), false);
  assert.equal(commands.some((command) => command.params?.key === 'Backspace'), true);
});
