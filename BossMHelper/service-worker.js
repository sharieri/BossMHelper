importScripts('native-send.js');

async function typeNativeText(tabId, text, replaceExisting) {
  const target = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(target, '1.3');
    attached = true;
    const commands = replaceExisting
      ? BossAssistantNativeSend.replaceTypeCommands(text)
      : BossAssistantNativeSend.typeCommands(text);
    for (const command of commands) {
      await chrome.debugger.sendCommand(target, command.method, command.params);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `真实键盘发送失败：${error.message}` };
  } finally {
    if (attached) {
      try { await chrome.debugger.detach(target); } catch { /* Tab may have navigated. */ }
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'NATIVE_TYPE') return;
  if (!BossAssistantNativeSend.isBossChatUrl(sender.tab?.url || '')) {
    sendResponse({ ok: false, error: 'Native typing is limited to the BOSS chat page.' });
    return;
  }
  typeNativeText(sender.tab.id, String(message.text || ''), Boolean(message.replaceExisting)).then(sendResponse);
  return true;
});
