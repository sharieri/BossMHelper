(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantDownwardTask = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const POST_SEND_DELAY_MS = 300;
  const MAX_SUCCESSOR_SCROLL_ATTEMPTS = 18;

  function uniqueVisibleEntries(entries) {
    const list = Array.isArray(entries) ? entries : [];
    const seen = new Set();
    const unique = [];
    for (const entry of list) {
      const key = entry?.key;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(entry);
    }
    return unique;
  }

  function nextDownwardTarget(entries, currentKey, processedKeys) {
    const list = uniqueVisibleEntries(entries);
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

  function defaultNextScrollTop(scrollTop, scrollHeight, clientHeight) {
    const maximum = Math.max(0, Number(scrollHeight) - Number(clientHeight));
    const current = Math.min(Math.max(0, Number(scrollTop)), maximum);
    const step = Math.max(220, Math.round(Number(clientHeight) * 0.72));
    return Math.min(maximum, current + step);
  }

  function downwardSuccessorStep({
    entries,
    currentKey,
    processedKeys,
    scrollTop,
    scrollHeight,
    clientHeight,
    scrollAttempts,
    maxScrollAttempts = MAX_SUCCESSOR_SCROLL_ATTEMPTS
  }, nextScrollTop = defaultNextScrollTop) {
    const uniqueEntries = uniqueVisibleEntries(entries);
    const attempts = Number(scrollAttempts) || 0;
    const processed = processedKeys && typeof processedKeys.has === 'function'
      ? processedKeys
      : new Set(Array.isArray(processedKeys) ? processedKeys : []);
    const target = nextDownwardTarget(uniqueEntries, currentKey, processed);
    if (target) return { type: 'target', target, scrollAttempts: 0 };

    if (attempts > 0 && !uniqueEntries.some((entry) => entry?.key === currentKey)) {
      const firstVisibleSuccessor = uniqueEntries.find((entry) => !processed.has(entry.key));
      if (firstVisibleSuccessor) return { type: 'target', target: firstVisibleSuccessor, scrollAttempts: 0 };
    }

    if (attempts >= maxScrollAttempts) return { type: 'complete', reason: 'scroll-limit' };

    const current = Number(scrollTop) || 0;
    const next = nextScrollTop(current, Number(scrollHeight) || 0, Number(clientHeight) || 0);
    if (next <= current) return { type: 'complete', reason: 'bottom' };

    return { type: 'scroll', scrollTop: next, scrollAttempts: attempts + 1 };
  }

  return {
    POST_SEND_DELAY_MS,
    MAX_SUCCESSOR_SCROLL_ATTEMPTS,
    downwardSuccessorStep,
    nextDownwardTarget,
    uniqueVisibleEntries
  };
});
