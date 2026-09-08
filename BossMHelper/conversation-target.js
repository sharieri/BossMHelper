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

  return { conversationIdentity, conversationTarget, conversationKey, uniqueConversationTargets, hasSelectedConversationClass, shouldRescanConversation };
});
