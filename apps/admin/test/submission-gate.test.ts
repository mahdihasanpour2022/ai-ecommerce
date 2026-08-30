import assert from 'node:assert/strict';
import test from 'node:test';
import { createSubmissionGate } from '../app/auth/submission-gate';

void test('coalesces duplicate submissions and permits a later submission after settlement', async () => {
  const gate = createSubmissionGate<readonly [string], string>();
  let calls = 0;
  let release: ((value: string) => void) | undefined;
  const action = () => {
    calls += 1;
    return new Promise<string>((resolve) => {
      release = resolve;
    });
  };

  const first = gate.run(action, 'first');
  const duplicate = gate.run(action, 'duplicate');
  assert.strictEqual(first, duplicate);
  assert.equal(calls, 1);
  release?.('done');
  assert.equal(await first, 'done');

  const later = gate.run(async () => 'later', 'later');
  assert.equal(await later, 'later');
  assert.equal(calls, 1);
});
