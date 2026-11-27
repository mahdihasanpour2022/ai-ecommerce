import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePlainText } from '@e-commerce/plain-text-security';
import {
  USER_COMMENT_MAX_LENGTH,
  userCommentSchema,
} from '../features/products/product/components/modals/comment/user-comment-form';

test('user comment accepts Persian, English, numbers and ordinary symbols', () => {
  const comment = 'کیفیت Product 10/10 بود؛ عالی! 😊';

  assert.deepEqual(userCommentSchema.parse({ comment: `  ${comment}  ` }), { comment });
  assert.deepEqual(validatePlainText(comment), { valid: true, value: comment });
});

test('user comment rejects empty and overlong values before submission', () => {
  assert.equal(userCommentSchema.safeParse({ comment: '   ' }).success, false);
  assert.equal(
    userCommentSchema.safeParse({ comment: 'ف'.repeat(USER_COMMENT_MAX_LENGTH + 1) }).success,
    false,
  );
});

test('plain-text security rejects common executable markup after schema validation', () => {
  const comment = '<script>alert(1)</script>';

  assert.equal(userCommentSchema.safeParse({ comment }).success, true);
  assert.equal(validatePlainText(comment).valid, false);
});
