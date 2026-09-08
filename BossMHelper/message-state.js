(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantMessageState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function messageStateFromRows(rows) {
    const items = (rows || []).filter((row) => /\bitem-(myself|friend)\b/.test(String(row.className || '')));
    const last = items.at(-1);
    if (!last) return { isOutgoing: false, isRead: false, hasReplyAfter: true };
    const isOutgoing = /\bitem-myself\b/.test(String(last.className || ''));
    const isRead = isOutgoing && (last.statusClassNames || []).some((className) => /\bstatus-read\b/.test(String(className)));
    return { isOutgoing, isRead, hasReplyAfter: !isOutgoing };
  }

  return { messageStateFromRows };
});
