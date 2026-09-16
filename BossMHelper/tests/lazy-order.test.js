const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const content = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function taskBody(name, nextName) {
  const start = content.indexOf(`async function ${name}`);
  const end = content.indexOf(`async function ${nextName}`, start);
  assert.notEqual(start, -1, `${name} should exist`);
  return content.slice(start, end === -1 ? content.length : end);
}

for (const [name, nextName] of [['runWakeTask', 'runFollowUpTask'], ['runFollowUpTask', 'sendTemplate']]) {
  test(`${name} locks its successor before sending the current conversation`, () => {
    const body = taskBody(name, nextName);
    const calls = body.match(/nextLazyDownwardTarget\(state\)/g) || [];
    assert.ok(calls.length >= 2, 'the current target and its successor must be resolved separately');
    assert.ok(body.indexOf('Lock the next row before sending') < body.indexOf('await sendCurrent(template)'));
  });
}
