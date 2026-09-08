(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantCollectionScroll = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function nextCollectionScrollTop(scrollTop, scrollHeight, clientHeight) {
    const maximum = Math.max(0, Number(scrollHeight) - Number(clientHeight));
    const current = Math.min(Math.max(0, Number(scrollTop)), maximum);
    const step = Math.max(220, Math.round(Number(clientHeight) * 0.72));
    return Math.min(maximum, current + step);
  }

  return { nextCollectionScrollTop };
});
