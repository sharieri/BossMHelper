const { normalizeTemplate, addExclusion, removeExclusion } = BossAssistantShared;

const KEYS = { wake: 'wakeTemplate', followUp: 'followUpTemplate', exclusions: 'exclusions' };
const $ = (selector) => document.querySelector(selector);
const wakeTemplate = $('#wakeTemplate');
const followUpTemplate = $('#followUpTemplate');
const wakeButton = $('#wakeButton');
const followUpButton = $('#followUpButton');
const stopButton = $('#stopButton');
const status = $('#status');
const exclusionCount = $('#exclusionCount');
const exclusionList = $('#exclusionList');
const diagnoseButton = $('#diagnoseButton');
const testCurrentButton = $('#testCurrentButton');
let exclusions = [];
let running = false;

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = `status ${kind}`;
}

function setRunning(value) {
  running = value;
  wakeButton.disabled = value;
  followUpButton.disabled = value;
  $('#addCurrent').disabled = value;
  diagnoseButton.disabled = value;
  testCurrentButton.disabled = value;
  stopButton.hidden = !value;
}

async function saveTemplates() {
  await chrome.storage.local.set({
    [KEYS.wake]: wakeTemplate.value,
    [KEYS.followUp]: followUpTemplate.value
  });
}

function renderExclusions() {
  exclusionCount.textContent = `${exclusions.length} 位面试官`;
  exclusionList.replaceChildren();
  exclusions.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'excluded';
    const label = document.createElement('span'); label.textContent = entry.label;
    const remove = document.createElement('button'); remove.textContent = '移除';
    remove.addEventListener('click', async () => {
      exclusions = removeExclusion(exclusions, entry.key);
      await chrome.storage.local.set({ [KEYS.exclusions]: exclusions });
      renderExclusions();
    });
    item.append(label, remove); exclusionList.append(item);
  });
}

async function activeBossTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('https://www.zhipin.com/web/geek/chat')) {
    throw new Error('请先切换到 BOSS 直聘的消息页面。');
  }
  return tab;
}

async function sendToPage(message) {
  const tab = await activeBossTab();
  try { return await chrome.tabs.sendMessage(tab.id, message); }
  catch { throw new Error('消息页尚未准备好，请刷新 BOSS 直聘页面后重试。'); }
}

async function start(mode, onlyCurrent = false) {
  const template = normalizeTemplate(mode === 'wake' ? wakeTemplate.value : followUpTemplate.value);
  if (!template) { setStatus('请先填写对应的消息模板。', 'error'); return; }
  await saveTemplates();
  try {
    await sendToPage({ type: 'START_TASK', mode, template, exclusions, onlyCurrent });
    setRunning(true);
    setStatus(onlyCurrent ? '正在试发当前会话…' : '正在读取消息列表…', 'running');
  } catch (error) { setStatus(error.message, 'error'); }
}

$('#addCurrent').addEventListener('click', async () => {
  try {
    const response = await sendToPage({ type: 'GET_CURRENT_CONVERSATION' });
    if (!response?.ok) throw new Error(response?.error || '未能读取当前会话。');
    exclusions = addExclusion(exclusions, response.entry);
    await chrome.storage.local.set({ [KEYS.exclusions]: exclusions });
    renderExclusions(); setStatus(`已将“${response.entry.label}”加入排除名单。`);
  } catch (error) { setStatus(error.message, 'error'); }
});

diagnoseButton.addEventListener('click', async () => {
  try {
    const diagnostic = await sendToPage({ type: 'GET_DIAGNOSTICS' });
    if (!diagnostic?.ok) throw new Error(diagnostic?.error || '未能读取页面诊断信息。');
    const editor = diagnostic.editors[0];
    const button = diagnostic.sendButtons[0];
    setStatus(`诊断：会话 ${diagnostic.conversations} 个；输入框 ${diagnostic.editors.length}${editor ? `（${editor.tag}）` : ''}；发送按钮 ${diagnostic.sendButtons.length}${button ? `（${button.disabled ? '当前禁用' : '可用'}）` : ''}。`, diagnostic.editors.length && diagnostic.sendButtons.length ? '' : 'error');
  } catch (error) { setStatus(error.message, 'error'); }
});

wakeButton.addEventListener('click', () => start('wake'));
testCurrentButton.addEventListener('click', () => start('wake', true));
followUpButton.addEventListener('click', () => start('followUp'));
stopButton.addEventListener('click', async () => {
  try { await sendToPage({ type: 'STOP_TASK' }); setStatus('正在停止；当前会话结束后不再发送。', 'running'); }
  catch (error) { setStatus(error.message, 'error'); }
});

for (const field of [wakeTemplate, followUpTemplate]) field.addEventListener('input', () => saveTemplates());

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROGRESS') {
    const { sent, skipped, failed } = message.result;
    setStatus(`处理中：${message.label}（已发 ${sent}，跳过 ${skipped}，失败 ${failed}）`, 'running');
  }
  if (message.type === 'TASK_COMPLETE') {
    setRunning(false);
    if (message.error) { setStatus(`任务未启动：${message.error}`, 'error'); return; }
    const { sent, skipped, failed, stopped, failureReasons = [] } = message.result;
    const reason = failureReasons[0] ? ` 原因：${failureReasons[0]}` : '';
    setStatus(`${stopped ? '任务已停止' : '任务完成'}：已发 ${sent}，跳过 ${skipped}，失败 ${failed}。${reason}`, failed ? 'error' : '');
  }
});

(async () => {
  const saved = await chrome.storage.local.get([KEYS.wake, KEYS.followUp, KEYS.exclusions]);
  wakeTemplate.value = saved[KEYS.wake] || '';
  followUpTemplate.value = saved[KEYS.followUp] || '';
  exclusions = Array.isArray(saved[KEYS.exclusions]) ? saved[KEYS.exclusions] : [];
  renderExclusions();
})();
