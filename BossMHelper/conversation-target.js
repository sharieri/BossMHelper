(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantConversationTarget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function conversationIdentity(value) {
    const firstLine = String(value || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
    return firstLine.replace(/\s+/g, ' ').replace(/\s+\d{1,2}:\d{2}\s*$/, '').trim();
  }

  function conversationTarget(entry, scrollTop) {
    return { key: entry.key, label: entry.label, scrollTop };
  }

  function conversationKey(serverId, nameBoxText, fallbackText) {
    return String(serverId || '').trim()
      || conversationIdentity(nameBoxText)
      || conversationIdentity(fallbackText);
  }

  function uniqueConversationTargets(entries, limit) {
    const seen = new Set();
    const targets = [];
    for (const entry of entries || []) {
      if (!entry?.key || seen.has(entry.key)) continue;
      seen.add(entry.key);
      targets.push(entry);
      if (targets.length >= limit) break;
    }
    return targets;
  }

  function hasSelectedConversationClass(className) {
    return /(^|\s)selected(\s|$)/.test(String(className || ''));
  }

  function shouldRescanConversation(target, visibleEntries) {
    return Boolean(target?.key) && !(visibleEntries || []).some((entry) => entry.key === target.key);
  }

  function centeredConversationScrollTop({
    scrollTop = 0,
    scrollHeight = 0,
    clientHeight = 0,
    containerTop = 0,
    rowTop = 0,
    rowHeight = 0
  } = {}) {
    const currentScrollTop = Number.isFinite(Number(scrollTop)) ? Number(scrollTop) : 0;
    const height = Number.isFinite(Number(scrollHeight)) ? Number(scrollHeight) : 0;
    const viewport = Number.isFinite(Number(clientHeight)) ? Number(clientHeight) : 0;
    const maximum = Math.max(0, height - viewport);
    const rowOffset = currentScrollTop + (Number(rowTop) || 0) - (Number(containerTop) || 0);
    const centered = rowOffset - (viewport - (Number(rowHeight) || 0)) / 2;
    return Math.min(maximum, Math.max(0, Math.round(centered)));
  }

  return { conversationIdentity, conversationTarget, conversationKey, uniqueConversationTargets, hasSelectedConversationClass, shouldRescanConversation, centeredConversationScrollTop };
});
