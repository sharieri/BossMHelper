const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAuditReport } = require('../audit-report.js');

test('buildAuditReport identifies conflicting selected targets without retaining editor text', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    candidates: [{ key: 'A', label: 'A', tag: 'div', className: 'item', top: 100, height: 90, dataKeys: [], text: 'message preview' }],
    classSelectedKey: 'A',
    visualSelectedKey: 'B',
    composer: { tag: 'div', contentEditable: 'true', text: 'private draft' },
    sendButton: { tag: 'button', disabled: true, text: '发送' }
  });

  assert.equal(report.readOnly, true);
  assert.equal(report.selection.agrees, false);
  assert.equal(report.composer.textLength, 13);
  assert.equal('text' in report.composer, false);
  assert.equal('text' in report.candidates[0], false);
});

test('buildAuditReport redacts conversation names while retaining key diagnostics', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    candidates: [{ key: 'Recruiter A Example Company | HR', label: 'Recruiter A Example Company | HR', tag: 'li', text: '' }],
    classSelectedKey: 'Recruiter A Example Company | HR'
  });

  assert.equal('key' in report.candidates[0], false);
  assert.equal('label' in report.candidates[0], false);
  assert.deepEqual(report.candidates[0].keyInfo, { kind: 'text', length: 32 });
  assert.deepEqual(report.selection.classSelectedKey, { kind: 'text', length: 32 });
});

test('buildAuditReport retains non-content editor geometry for target diagnosis', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    editorCandidates: [{ tag: 'textarea', className: 'input', top: 810, left: 700, width: 900, height: 68, visible: true, valueLength: 12 }]
  });

  assert.deepEqual(report.editorCandidates, [{ tag: 'textarea', className: 'input', contentEditable: '', top: 810, left: 700, width: 900, height: 68, visible: true, display: '', visibility: '', focused: false, valueLength: 12 }]);
});

test('buildAuditReport retains a text-free message state audit', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    messageAudit: { messageCount: 4, messages: [{ className: 'message self', textLength: 12 }] }
  });

  assert.deepEqual(report.messageAudit, {
    messageCount: 4,
    containerCandidates: [],
    chosenContainer: null,
    containerChildren: [],
    messages: [{ className: 'message self', textLength: 12, statusNodes: [] }]
  });
});

test('buildAuditReport exposes only status-node metadata for message-state inspection', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    messageAudit: { messageCount: 1, messages: [{ className: 'message self', textLength: 12 }] }
  });

  assert.deepEqual(report.messageAudit.messages[0].statusNodes, []);
});

test('buildAuditReport keeps a bounded, text-free ancestor trail for a BOSS status marker', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    messageAudit: {
      messageCount: 1,
      messages: [{
        className: 'message-status status-read',
        statusNodes: [{
          tag: 'i',
          className: 'message-status status-read',
          token: '已读',
          ancestors: [{ tag: 'div', className: 'message-item self', top: 10, left: 20, width: 30, height: 40 }]
        }]
      }]
    }
  });

  assert.deepEqual(report.messageAudit.messages[0].statusNodes[0].ancestors, [
    { tag: 'div', className: 'message-item self', top: 10, left: 20, width: 30, height: 40 }
  ]);
});

test('buildAuditReport retains chat-pane geometry without retaining message text', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    messageAudit: {
      messageCount: 0,
      containerCandidates: [{ tag: 'div', className: 'chat-pane', left: 636, top: 161, width: 1236, height: 646 }],
      chosenContainer: { tag: 'div', className: 'chat-pane', left: 636, top: 161, width: 1236, height: 646 },
      containerChildren: [{ tag: 'div', className: 'message-row', left: 700, top: 200, width: 900, height: 80, childClasses: ['text'] }]
    }
  });

  assert.equal(report.messageAudit.containerCandidates[0].className, 'chat-pane');
  assert.deepEqual(report.messageAudit.containerChildren[0].childClasses, ['text']);
});

test('buildAuditReport retains collection scroll diagnostics without contact names', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    collectionAudit: { uniqueCount: 67, rounds: [{ round: 0, scrollTop: 0, visibleCount: 40, newKeys: 40 }] }
  });

  assert.deepEqual(report.collectionAudit, { uniqueCount: 67, rounds: [{ round: 0, scrollTop: 0, visibleCount: 40, newKeys: 40 }], scrollTargets: [] });
});

test('buildAuditReport retains scroll target candidates for container diagnosis', () => {
  const report = buildAuditReport({
    urlPath: '/web/geek/chat',
    collectionAudit: { uniqueCount: 40, rounds: [], scrollTargets: [{ className: 'list-scroll', scrollHeight: 3120, clientHeight: 736 }] }
  });

  assert.deepEqual(report.collectionAudit.scrollTargets, [{ className: 'list-scroll', scrollHeight: 3120, clientHeight: 736 }]);
});
