(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantSendCommand = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function enterCommand() {
    return { key: 'Enter', code: 'Enter', keyCode: 13 };
  }

  return { enterCommand };
});
