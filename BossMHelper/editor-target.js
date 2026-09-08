(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantEditorTarget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function chooseVisibleEditor(candidates) {
    const list = Array.isArray(candidates) ? candidates : [];
    const visible = list.filter((candidate) => candidate?.visible && candidate.width > 20 && candidate.height > 10);
    const preferred = visible.sort((left, right) => (right.width * right.height) - (left.width * left.height))[0] || list[0];
    return preferred?.element || null;
  }

  return { chooseVisibleEditor };
});
