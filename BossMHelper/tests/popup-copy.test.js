const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupControls = fs.readFileSync(path.join(root, 'popup-controls.js'), 'utf8');

test('popup labels explain bulk tasks start at the selected conversation and continue downward', () => {
  assert.match(popupHtml, /从当前选中会话向下唤醒/);
  assert.match(popupHtml, /从当前选中会话向下跟进已读未回/);
  assert.match(popupHtml, /批量任务会从当前选中会话开始向下处理/);
});

test('popup status copy explains downward task direction and 1000ms send spacing', () => {
  assert.match(popupControls, /从当前选中会话开始向下读取/);
  assert.match(popupControls, /每人 1 秒 \(1000ms\) 发送/);
  assert.match(popupControls, /准备就绪：批量任务会从当前选中会话开始向下处理/);
});
