(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantTaskRunner = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function nextTaskAction(entry, exclusions) {
    return exclusions?.has(entry?.key) ? { type: 'skip' } : { type: 'send' };
  }

  return { nextTaskAction };
});
