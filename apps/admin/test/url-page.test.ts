import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePageParam } from '../hooks/use-url-page';

void test('parses only positive safe page numbers from the URL', () => {
  assert.equal(parsePageParam(null), 1);
  assert.equal(parsePageParam(''), 1);
  assert.equal(parsePageParam('0'), 1);
  assert.equal(parsePageParam('-1'), 1);
  assert.equal(parsePageParam('2.5'), 1);
  assert.equal(parsePageParam('9007199254740992'), 1);
  assert.equal(parsePageParam('2'), 2);
});
