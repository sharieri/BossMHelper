(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantDownwardTask = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const POST_SEND_DELAY_MS = 300;

  function nextDownwardTarget(entries, currentKey, processedKeys) {
    const list = Array.isArray(entries) ? entries : [];
    if (currentKey === undefined || currentKey === null) return null;

    const startIndex = list.findIndex((entry) => entry?.key === currentKey);
    if (startIndex < 0) return null;

    const processed = processedKeys && typeof processedKeys.has === 'function'
      ? processedKeys
      : new Set(Array.isArray(processedKeys) ? processedKeys : []);
    const seen = new Set();

    for (let index = startIndex; index < list.length; index += 1) {
      const entry = list[index];
      const key = entry?.key;
      if (key === undefined || key === null || seen.has(key)) continue;
      seen.add(key);
      if (!processed.has(key)) return entry;
    }

    return null;
  }

  return { POST_SEND_DELAY_MS, nextDownwardTarget };
});
