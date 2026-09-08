(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantSendConfirmation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isSendConfirmed({ editorText, newestMessageText, template }) {
    const editor = String(editorText || '').trim();
    const newest = String(newestMessageText || '').trim();
    const expected = String(template || '').trim();
    return !editor || (Boolean(expected) && newest.includes(expected));
  }

  return { isSendConfirmed };
});
