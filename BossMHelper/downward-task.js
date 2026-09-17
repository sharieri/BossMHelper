(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantDownwardTask = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const POST_SEND_DELAY_MS = 1000;
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

  function orderedEntries(entries) {
    const unique = uniqueVisibleEntries(entries);
    if (!unique.some((entry) => Number.isFinite(Number(entry?.position)))) return unique;
    return unique
      .map((entry, index) => ({ entry, index, position: Number(entry?.position) }))
      .sort((left, right) => {
        const leftKnown = Number.isFinite(left.position);
        const rightKnown = Number.isFinite(right.position);
        if (leftKnown && rightKnown) return left.position - right.position || left.index - right.index;
        if (leftKnown) return -1;
        if (rightKnown) return 1;
        return left.index - right.index;
      })
      .map(({ entry }) => entry);
  }

  function nextDownwardTarget(entries, currentKey, processedKeys) {
    const list = orderedEntries(entries);
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
    anchorPosition,
    maxScrollAttempts = MAX_SUCCESSOR_SCROLL_ATTEMPTS
  }, nextScrollTop = defaultNextScrollTop) {
    const uniqueEntries = orderedEntries(entries);
    const attempts = Number(scrollAttempts) || 0;
    const processed = processedKeys && typeof processedKeys.has === 'function'
      ? processedKeys
      : new Set(Array.isArray(processedKeys) ? processedKeys : []);
    const target = nextDownwardTarget(uniqueEntries, currentKey, processed);
    if (target) return { type: 'target', target, scrollAttempts: 0 };

    if (attempts > 0 && !uniqueEntries.some((entry) => entry?.key === currentKey)) {
      const anchor = Number(anchorPosition);
      const firstVisibleSuccessor = uniqueEntries.find((entry) => {
        if (processed.has(entry.key)) return false;
        if (!Number.isFinite(anchor)) return true;
        return Number.isFinite(Number(entry.position)) && Number(entry.position) > anchor;
      });
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
