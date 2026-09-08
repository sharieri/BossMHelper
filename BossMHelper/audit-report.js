(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BossAssistantAuditReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function keyInfo(value) {
    const key = String(value || '');
    if (!key) return { kind: 'empty', length: 0 };
    return { kind: /^\d{1,2}:\d{2}$/.test(key) ? 'time' : 'text', length: key.length };
  }

  function buildAuditReport(input) {
    const layout = (item) => item ? {
      tag: item.tag,
      className: item.className,
      top: item.top,
      left: item.left,
      width: item.width,
      height: item.height
    } : null;
    const candidates = (input.candidates || []).slice(0, 12).map((candidate, index) => {
      const { text, key, label, ...safeCandidate } = candidate;
      safeCandidate.keyInfo = keyInfo(key);
      if (index >= 3) delete safeCandidate.tree;
      return safeCandidate;
    });
    const composer = input.composer ? {
      tag: input.composer.tag,
      contentEditable: input.composer.contentEditable,
      className: input.composer.className,
      role: input.composer.role,
      textLength: String(input.composer.text || '').length
    } : null;
    const editorCandidates = (input.editorCandidates || []).slice(0, 10).map((candidate) => ({
      tag: candidate.tag,
      className: candidate.className,
      contentEditable: candidate.contentEditable || '',
      top: candidate.top,
      left: candidate.left,
      width: candidate.width,
      height: candidate.height,
      visible: Boolean(candidate.visible),
      display: candidate.display || '',
      visibility: candidate.visibility || '',
      focused: Boolean(candidate.focused),
      valueLength: candidate.valueLength
    }));
    const sendButton = input.sendButton ? {
      tag: input.sendButton.tag,
      className: input.sendButton.className,
      disabled: Boolean(input.sendButton.disabled),
      classDisabled: Boolean(input.sendButton.classDisabled),
      matchesDisabled: Boolean(input.sendButton.matchesDisabled),
      text: input.sendButton.text
    } : null;
    const messageAudit = input.messageAudit ? {
      messageCount: Number(input.messageAudit.messageCount || 0),
      containerCandidates: (input.messageAudit.containerCandidates || []).slice(0, 12).map(layout),
      chosenContainer: layout(input.messageAudit.chosenContainer),
      containerChildren: (input.messageAudit.containerChildren || []).slice(-12).map((child) => ({
        ...layout(child),
        childClasses: (child.childClasses || []).slice(0, 8)
      })),
      messages: (input.messageAudit.messages || []).slice(-6).map((message) => {
        const { statusNodes, ...safeMessage } = message;
        return {
          ...safeMessage,
          statusNodes: (statusNodes || []).slice(0, 12).map((node) => ({
            tag: node.tag,
            className: node.className,
            parentClassName: node.parentClassName,
            token: node.token,
            top: node.top,
            left: node.left,
            width: node.width,
          height: node.height
          ,ancestors: (node.ancestors || []).slice(0, 5).map((ancestor) => ({
            tag: ancestor.tag,
            className: ancestor.className,
            top: ancestor.top,
            left: ancestor.left,
            width: ancestor.width,
            height: ancestor.height
          }))
        }))
        };
      })
    } : null;
    const collectionAudit = input.collectionAudit ? {
      uniqueCount: Number(input.collectionAudit.uniqueCount || 0),
      rounds: (input.collectionAudit.rounds || []).slice(0, 80).map((round) => ({ ...round })),
      scrollTargets: (input.collectionAudit.scrollTargets || []).slice(0, 20).map((target) => ({ ...target }))
    } : null;
    const classKey = input.classSelectedKey || null;
    const visualKey = input.visualSelectedKey || null;
    return {
      format: 3,
      readOnly: true,
      urlPath: input.urlPath,
      candidates,
      candidateCount: (input.candidates || []).length,
      selection: {
        classSelectedKey: classKey ? keyInfo(classKey) : null,
        visualSelectedKey: visualKey ? keyInfo(visualKey) : null,
        agrees: classKey && visualKey ? classKey === visualKey : null
      },
      composer,
      editorCandidates,
      messageAudit,
      collectionAudit,
      sendButton
    };
  }

  return { buildAuditReport };
});
