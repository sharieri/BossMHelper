const test = require('node:test');
const assert = require('node:assert/strict');
const { pickConversationRows } = require('../conversation-heuristics.js');

test('pickConversationRows keeps one visible contact card per vertical row', () => {
  const rows = pickConversationRows([
    { id: 'pane', top: 160, width: 545, height: 930, text: '所有联系人', hasAvatar: false },
    { id: 'a-wrapper', top: 310, width: 530, height: 110, text: '宣小健 杭州诚猎企业管理 猎头顾问', hasAvatar: true },
    { id: 'a-child', top: 314, width: 500, height: 98, text: '宣小健 杭州诚猎企业管理', hasAvatar: true },
    { id: 'b-wrapper', top: 435, width: 530, height: 110, text: '李倩 软通动力 资深招聘顾问', hasAvatar: true },
    { id: 'header', top: 248, width: 520, height: 35, text: '全部 未读 新招呼', hasAvatar: false }
  ], 290);

  assert.deepEqual(rows.map((row) => row.id), ['a-wrapper', 'b-wrapper']);
});
