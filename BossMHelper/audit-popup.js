const auditButton = document.querySelector('#auditButton');
const previewButton = document.querySelector('#previewButton');
const messageAuditButton = document.querySelector('#messageAuditButton');
const collectionScanButton = document.querySelector('#collectionScanButton');
const draftButton = document.querySelector('#draftButton');
const replaceDraftButton = document.querySelector('#replaceDraftButton');
const sendCurrentButton = document.querySelector('#sendCurrentButton');
const copyAuditButton = document.querySelector('#copyAuditButton');
const auditOutput = document.querySelector('#auditOutput');
const auditStatus = document.querySelector('#status');
const wakeTemplate = document.querySelector('#wakeTemplate');
const followUpTemplate = document.querySelector('#followUpTemplate');
const TEMPLATE_KEYS = { wake: 'wakeTemplate', followUp: 'followUpTemplate' };
const { addExclusion, removeExclusion } = BossAssistantShared;
const wakeAllButton = document.querySelector('#wakeAllButton');
const stopButton = document.querySelector('#stopButton');
const addCurrentButton = document.querySelector('#addCurrentButton');
const exclusionCount = document.querySelector('#exclusionCount');
const exclusionList = document.querySelector('#exclusionList');
let exclusions = [];
let running = false;

function setAuditStatus(message, error = false) {
  auditStatus.textContent = message;
  auditStatus.className = `status ${error ? 'error' : ''}`;
}

function setRunning(value) {
  running = value;
  wakeAllButton.disabled = value;
  sendCurrentButton.disabled = value;
  addCurrentButton.disabled = value;
  stopButton.hidden = !value;
}

function renderExclusions() {
  exclusionCount.textContent = `${exclusions.length} 位面试官`;
  exclusionList.replaceChildren();
  exclusions.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'excluded';
    const label = document.createElement('span');
    label.textContent = entry.label;
    const remove = document.createElement('button');
    remove.textContent = '移除';
    remove.addEventListener('click', async () => {
      exclusions = removeExclusion(exclusions, entry.key);
      await chrome.storage.local.set({ exclusions });
      renderExclusions();
    });
    item.append(label, remove);
    exclusionList.append(item);
  });
}

async function currentBossTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith('https://www.zhipin.com/web/geek/chat')) throw new Error('请先切换到 BOSS 直聘消息页。');
  return tab;
}

auditButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_AUDIT' });
    if (!response?.ok) throw new Error(response?.error || '未能读取页面审计结果。');
    auditOutput.value = JSON.stringify(response.report, null, 2);
    copyAuditButton.disabled = false;
    setAuditStatus(`审计完成：发现 ${response.report.candidateCount} 个候选会话；未输入或发送任何消息。`);
  } catch (error) { setAuditStatus(error.message, true); }
});

previewButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    previewButton.disabled = true;
    setAuditStatus('正在验证前三个会话切换：不会输入或发送消息。');
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PREVIEW_SELECTION' });
    if (!response?.ok) throw new Error(response?.error || '会话切换验证未完成。');
    const { tested, selected, failed } = response.result;
    auditOutput.value = JSON.stringify(response.result, null, 2);
    copyAuditButton.disabled = false;
    setAuditStatus(`切换验证完成：测试 ${tested} 个，会话正确选中 ${selected} 个，失败 ${failed} 个。`, failed > 0);
  } catch (error) { setAuditStatus(error.message, true); }
  finally { previewButton.disabled = false; }
});

messageAuditButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_AUDIT' });
    if (!response?.ok) throw new Error(response?.error || '未能读取消息状态审计。');
    auditOutput.value = JSON.stringify(response.report.messageAudit, null, 2);
    copyAuditButton.disabled = false;
    setAuditStatus('当前会话消息状态审计完成：未读取或发送消息文字。');
  } catch (error) { setAuditStatus(error.message, true); }
});

collectionScanButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    collectionScanButton.disabled = true;
    setAuditStatus('正在扫描会话列表：不会切换、输入或发送消息。');
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_COLLECTION' });
    if (!response?.ok) throw new Error(response?.error || '会话扫描未完成。');
    auditOutput.value = JSON.stringify(response.result, null, 2);
    copyAuditButton.disabled = false;
    setAuditStatus(`会话扫描完成：发现 ${response.result.uniqueCount} 个唯一会话。`);
  } catch (error) { setAuditStatus(error.message, true); }
  finally { collectionScanButton.disabled = false; }
});

draftButton.addEventListener('click', async () => {
  try {
    const template = wakeTemplate.value.trim();
    if (!template) throw new Error('请先填写唤醒消息模板。');
    const tab = await currentBossTab();
    draftButton.disabled = true;
    await chrome.storage.local.set({ [TEMPLATE_KEYS.wake]: wakeTemplate.value, [TEMPLATE_KEYS.followUp]: followUpTemplate.value });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'DRAFT_CURRENT', template });
    if (!response?.ok) throw new Error(response?.error || '草稿写入验证未完成。');
    auditOutput.value = JSON.stringify(response.result, null, 2);
    copyAuditButton.disabled = false;
    setAuditStatus(`草稿验证完成：输入框匹配 ${response.result.editorMatches ? '是' : '否'}；发送按钮可用 ${response.result.sendEnabled ? '是' : '否'}。未发送消息。`, !response.result.editorMatches);
  } catch (error) { setAuditStatus(error.message, true); }
  finally { draftButton.disabled = false; }
});

replaceDraftButton.addEventListener('click', async () => {
  try {
    const template = wakeTemplate.value.trim();
    if (!template) throw new Error('请先填写唤醒消息模板。');
    const tab = await currentBossTab();
    replaceDraftButton.disabled = true;
    await chrome.storage.local.set({ [TEMPLATE_KEYS.wake]: wakeTemplate.value, [TEMPLATE_KEYS.followUp]: followUpTemplate.value });
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'REPLACE_DRAFT_CURRENT', template });
    if (!response?.ok) throw new Error(response?.error || '草稿替换验证未完成。');
    auditOutput.value = JSON.stringify(response.result, null, 2);
    copyAuditButton.disabled = false;
    setAuditStatus(`草稿替换完成：输入框匹配 ${response.result.editorMatches ? '是' : '否'}；未发送消息。`, !response.result.editorMatches);
  } catch (error) { setAuditStatus(error.message, true); }
  finally { replaceDraftButton.disabled = false; }
});

sendCurrentButton.addEventListener('click', async () => {
  try {
    const template = wakeTemplate.value.trim();
    if (!template) throw new Error('请先填写唤醒消息模板。');
    const tab = await currentBossTab();
    sendCurrentButton.disabled = true;
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SEND_CURRENT', template });
    if (!response?.ok) throw new Error(response?.error || '当前会话消息未被确认发送。');
    setAuditStatus('当前会话消息已由页面确认发送。');
  } catch (error) { setAuditStatus(error.message, true); }
  finally { sendCurrentButton.disabled = false; }
});

wakeAllButton.addEventListener('click', async () => {
  try {
    const template = wakeTemplate.value.trim();
    if (!template) throw new Error('请先填写唤醒消息模板。');
    const tab = await currentBossTab();
    await chrome.storage.local.set({ [TEMPLATE_KEYS.wake]: wakeTemplate.value, [TEMPLATE_KEYS.followUp]: followUpTemplate.value, exclusions });
    setRunning(true);
    setAuditStatus('正在读取会话并按每人 1 秒发送；可随时点击停止。');
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'WAKE_ALL', template, exclusions });
    if (!response?.ok) throw new Error(response?.error || '唤醒任务未启动。');
  } catch (error) {
    setRunning(false);
    setAuditStatus(error.message, true);
  }
});

stopButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    await chrome.tabs.sendMessage(tab.id, { type: 'STOP_TASK' });
    setAuditStatus('将在当前会话处理结束后停止。');
  } catch (error) { setAuditStatus(error.message, true); }
});

addCurrentButton.addEventListener('click', async () => {
  try {
    const tab = await currentBossTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_CONVERSATION' });
    if (!response?.ok) throw new Error(response?.error || '请先选择一位面试官。');
    exclusions = addExclusion(exclusions, response.entry);
    await chrome.storage.local.set({ exclusions });
    renderExclusions();
    setAuditStatus('当前面试官已加入长期排除名单。');
  } catch (error) { setAuditStatus(error.message, true); }
});

copyAuditButton.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(auditOutput.value); setAuditStatus('审计结果已复制；请直接粘贴到对话中。'); }
  catch { setAuditStatus('复制失败，请手动复制下方内容。', true); }
});

for (const field of [wakeTemplate, followUpTemplate]) {
  field.addEventListener('input', () => chrome.storage.local.set({
    [TEMPLATE_KEYS.wake]: wakeTemplate.value,
    [TEMPLATE_KEYS.followUp]: followUpTemplate.value
  }));
}

(async () => {
  const saved = await chrome.storage.local.get([TEMPLATE_KEYS.wake, TEMPLATE_KEYS.followUp, 'exclusions']);
  wakeTemplate.value = saved[TEMPLATE_KEYS.wake] || '';
  followUpTemplate.value = saved[TEMPLATE_KEYS.followUp] || '';
  exclusions = Array.isArray(saved.exclusions) ? saved.exclusions : [];
  renderExclusions();
})();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROGRESS') {
    const { sent, skipped, failed } = message.result;
    setAuditStatus(`处理中：已发 ${sent}，跳过 ${skipped}，失败 ${failed}。`);
  }
  if (message.type === 'TASK_COMPLETE') {
    setRunning(false);
    const { sent, skipped, failed, stopped, failureReasons = [] } = message.result;
    const reason = failureReasons[0] ? ` 原因：${failureReasons[0]}` : '';
    setAuditStatus(`${stopped ? '任务已停止' : '任务完成'}：已发 ${sent}，跳过 ${skipped}，失败 ${failed}。${reason}`, failed > 0);
  }
});
