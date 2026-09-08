(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantEditorWrite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function shouldUseEditableCommand(candidate) {
    return Boolean(candidate?.isContentEditable && candidate?.visible);
  }

  return { shouldUseEditableCommand };
});
