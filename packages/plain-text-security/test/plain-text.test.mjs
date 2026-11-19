import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePlainText } from '../dist/index.js';

void test('normalizes safe Unicode and whitespace without rejecting ordinary script text', () => {
  assert.deepEqual(validatePlainText('  Ｔیشرت   script  '), {
    valid: true,
    value: 'Tیشرت script',
  });
});

void test('rejects disallowed control characters', () => {
  assert.deepEqual(validatePlainText('متن\u0000مخفی'), {
    valid: false,
    reason: 'DISALLOWED_CONTROL_CHARACTER',
  });
});

void test('rejects HTML markup', () => {
  assert.deepEqual(validatePlainText('<img src=x>'), {
    valid: false,
    reason: 'HTML_MARKUP',
  });
});

void test('rejects HTML event handlers', () => {
  assert.deepEqual(validatePlainText('onclick = alert(1)'), {
    valid: false,
    reason: 'HTML_EVENT_HANDLER',
  });
});

void test('rejects executable protocols', () => {
  assert.deepEqual(validatePlainText('javascript: alert(1)'), {
    valid: false,
    reason: 'EXECUTABLE_PROTOCOL',
  });
});

void test('rejects common script execution patterns', () => {
  assert.deepEqual(validatePlainText('setTimeout(alert, 0)'), {
    valid: false,
    reason: 'SCRIPT_EXECUTION',
  });
});
