const { addExclusion, removeExclusion } = BossAssistantShared;

const $ = (selector) => document.querySelector(selector);
const wakeTemplate = $('#wakeTemplate');
const followUpTemplate = $('#followUpTemplate');
const wakeAllButton = $('#wakeAllButton');
const followUpButton = $('#followUpButton');
const messageAuditButton = $('#messageAuditButton');
const stopButton = $('#stopButton');
const addCurrentButton = $('#addCurrentButton');
const exclusionCount = $('#exclusionCount');
const exclusionList = $('#exclusionList');
const status = $('#status');
const auditOutput = $('#auditOutput');
const TEMPLATE_KEYS = { wake: 'wakeTemplate', followUp: 'followUpTemplate' };
let exclusions = [];

function setStatus(message, error = false) {
  status.textContent = message;
  status.className = `status ${error ? 'error' : ''}`;
}

function setRunning(value) {
  wakeAllButton.disabled = value;
  followUpButton.disabled = value;
  addCurrentButton.disabled = value;
  messageAuditButton.disabled = value;
  stopButton.hidden = !value;
}

messageAuditButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_AUDIT' });
    if (!response?.ok) throw new Error(response?.error || '无法读取当前会话状态。');
    auditOutput.value = JSON.stringify(response.report.messageAudit, null, 2);
    setStatus('识别完成：结果仅包含消息结构和已读状态标记，未发送任何消息。');
  } catch (error) {
    setStatus(error.message, true);
  }
});

function renderExclusions() {
  exclusionCount.textContent = `${exclusions.length} 位面试官`;
  exclusionList.replaceChildren();
  exclusions.forEach((entry) => {
    const row = document.createElement('li');
    row.className = 'excluded';
    const label = document.createElement('span');
    label.textContent = entry.label;
    const remove = document.createElement('button');
    remove.textContent = '移除';
    remove.addEventListener('click', async () => {
      exclusions = removeExclusion(exclusions, entry.key);
      await chrome.storage.local.set({ exclusions });
      renderExclusions();
    });
    row.append(label, remove);
    exclusionList.append(row);
  });
}

async function currentBossTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('https://www.zhipin.com/web/geek/chat')) throw new Error('请先打开 BOSS 直聘消息页。');
  return tab;
}

async function saveSettings() {
  await chrome.storage.local.set({
    [TEMPLATE_KEYS.wake]: wakeTemplate.value,
    [TEMPLATE_KEYS.followUp]: followUpTemplate.value,
    exclusions
  });
}

wakeAllButton.addEventListener('click', async () => {
  try {
    const template = wakeTemplate.value.trim();
    if (!template) throw new Error('请先填写唤醒消息模板。');
    const tab = await currentBossTab();
    await saveSettings();
    setRunning(true);
    setStatus('正在读取全部会话，并按每人 1 秒发送；可随时停止。');
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'WAKE_ALL', template, exclusions });
    if (!response?.ok) throw new Error(response?.error || '唤醒任务未启动。');
  } catch (error) {
    setRunning(false);
    setStatus(error.message, true);
  }
});

followUpButton.addEventListener('click', async () => {
  try {
    const template = followUpTemplate.value.trim();
    if (!template) throw new Error('请先填写已读未回模板。');
    const tab = await currentBossTab();
    await saveSettings();
    setRunning(true);
    setStatus('正在识别已读未回会话，并按每人 1 秒发送；可随时停止。');
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'FOLLOW_UP_READ', template, exclusions });
    if (!response?.ok) throw new Error(response?.error || '跟进任务未启动。');
  } catch (error) {
    setRunning(false);
    setStatus(error.message, true);
  }
});

stopButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    await chrome.tabs.sendMessage(tab.id, { type: 'STOP_TASK' });
    setStatus('将在当前会话完成后停止。');
  } catch (error) { setStatus(error.message, true); }
});

addCurrentButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_CONVERSATION' });
    if (!response?.ok) throw new Error(response?.error || '请先选择一位面试官。');
    exclusions = addExclusion(exclusions, response.entry);
    await saveSettings();
    renderExclusions();
    setStatus('当前面试官已加入长期排除名单。');
  } catch (error) { setStatus(error.message, true); }
});

for (const field of [wakeTemplate, followUpTemplate]) field.addEventListener('input', saveSettings);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROGRESS') {
    const { sent, skipped, failed } = message.result;
    setStatus(`处理中：已发 ${sent}，跳过 ${skipped}，失败 ${failed}。`);
  }
  if (message.type === 'TASK_COMPLETE') {
    setRunning(false);
    const { sent, skipped, failed, stopped, failureReasons = [] } = message.result;
    const reason = failureReasons[0] ? ` 原因：${failureReasons[0]}` : '';
    setStatus(`${stopped ? '任务已停止' : '任务完成'}：已发 ${sent}，跳过 ${skipped}，失败 ${failed}。${reason}`, failed > 0);
  }
});

(async () => {
  const saved = await chrome.storage.local.get([TEMPLATE_KEYS.wake, TEMPLATE_KEYS.followUp, 'exclusions']);
  wakeTemplate.value = saved[TEMPLATE_KEYS.wake] || '';
  followUpTemplate.value = saved[TEMPLATE_KEYS.followUp] || '';
  exclusions = Array.isArray(saved.exclusions) ? saved.exclusions : [];
  renderExclusions();
  setRunning(false);
  setStatus('准备就绪：两项任务仅在你点击按钮后执行。');
})();
