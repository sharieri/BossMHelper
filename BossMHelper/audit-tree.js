(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantAuditTree = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_CHILDREN = 12;
  const MAX_TEXT = 30;

  function shorten(value, limit = MAX_TEXT) {
    const text = String(value || '');
    return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
  }

  function limitAuditTree(node, maxDepth) {
    if (!node) return null;
    const result = {
      tag: String(node.tag || ''),
      className: String(node.className || ''),
      role: String(node.role || ''),
      attributes: { ...(node.attributes || {}) },
      text: shorten(node.text)
    };
    result.children = maxDepth > 0
      ? (node.children || []).slice(0, MAX_CHILDREN).map((child) => limitAuditTree(child, maxDepth - 1))
      : [];
    return result;
  }

  return { limitAuditTree };
});
