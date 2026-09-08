(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantShared = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeTemplate(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function canWriteDraft(existingValue, template) {
    return !normalizeTemplate(existingValue) && Boolean(normalizeTemplate(template));
  }

  function addExclusion(items, entry) {
    const list = Array.isArray(items) ? items : [];
    if (!entry || !entry.key || list.some((item) => item.key === entry.key)) return list;
    return [...list, { key: entry.key, label: entry.label || entry.key }];
  }

  function removeExclusion(items, key) {
    return (Array.isArray(items) ? items : []).filter((item) => item.key !== key);
  }

  function isUnreadFollowUpEligible(state) {
    return Boolean(state && state.isOutgoing && state.isRead && !state.hasReplyAfter);
  }

  return { normalizeTemplate, canWriteDraft, addExclusion, removeExclusion, isUnreadFollowUpEligible };
});
