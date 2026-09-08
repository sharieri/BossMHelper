(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantConversationScrollTarget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function chooseConversationScrollTarget(candidates) {
    const list = Array.isArray(candidates) ? candidates : [];
    return list.find((candidate) => /(^|\s)user-list-content(\s|$)/.test(String(candidate?.className || '')))
      || list.filter((candidate) => candidate?.scrollHeight > candidate?.clientHeight + 2)
        .sort((left, right) => (right.scrollHeight - right.clientHeight) - (left.scrollHeight - left.clientHeight))[0]
      || null;
  }

  return { chooseConversationScrollTarget };
});
