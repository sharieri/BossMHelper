(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantMessageContainerTarget = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function chooseMessageContainer(candidates, editor) {
    if (!editor) return null;
    const editorRight = editor.left + editor.width;
    const eligible = (candidates || []).filter((candidate) => {
      const right = candidate.left + candidate.width;
      const overlapsEditorColumn = candidate.left <= editor.left + 80 && right >= editorRight - 80;
      return candidate.width >= 500 && candidate.height >= 120 && overlapsEditorColumn;
    });
    return eligible.sort((left, right) => (right.width * right.height) - (left.width * left.height))[0] || null;
  }

  return { chooseMessageContainer };
});
