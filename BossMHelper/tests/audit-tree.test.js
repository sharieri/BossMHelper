const test = require('node:test');
const assert = require('node:assert/strict');
const { limitAuditTree } = require('../audit-tree.js');

test('limitAuditTree keeps structural attributes and bounds leaf text and depth', () => {
  const tree = limitAuditTree({
    tag: 'li', className: '', role: 'listitem', attributes: { 'data-x': '1' }, text: '',
    children: [{ tag: 'span', className: 'name', role: '', attributes: {}, text: 'Recruiter Name Is Longer Than Thirty Characters', children: [] }]
  }, 2);

  assert.equal(tree.children[0].text, 'Recruiter Name Is Longer Than…');
  assert.deepEqual(tree.attributes, { 'data-x': '1' });
});
