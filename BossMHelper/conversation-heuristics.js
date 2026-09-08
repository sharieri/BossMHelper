(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantConversationHeuristics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function pickConversationRows(candidates, searchBottom) {
    const rows = (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => candidate.top >= searchBottom + 12)
      .filter((candidate) => candidate.width >= 280 && candidate.width <= 800)
      .filter((candidate) => candidate.height >= 55 && candidate.height <= 180)
      .filter((candidate) => candidate.hasAvatar && candidate.text.length >= 4)
      .sort((left, right) => left.top - right.top || (right.width * right.height) - (left.width * left.height));

    const picked = [];
    for (const row of rows) {
      const existingIndex = picked.findIndex((existing) => Math.abs(existing.top - row.top) < 20);
      if (existingIndex === -1) picked.push(row);
      else if (row.width * row.height > picked[existingIndex].width * picked[existingIndex].height) picked[existingIndex] = row;
    }
    return picked;
  }

  return { pickConversationRows };
});
