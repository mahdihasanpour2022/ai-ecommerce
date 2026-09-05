import assert from 'node:assert/strict';
import test from 'node:test';
import { CSRF_COOKIE_NAME, csrfCredentialStore } from '../app/http/csrf-credential';
import { installDomEnvironment } from './dom-environment';

void test('reads the server-issued CSRF credential from the readable browser cookie', () => {
  const cleanup = installDomEnvironment();
  try {
    document.cookie = `${CSRF_COOKIE_NAME}=server-issued-token; Path=/; SameSite=Strict`;

    assert.equal(csrfCredentialStore.get(), 'server-issued-token');
    assert.throws(
      () => csrfCredentialStore.set('client-issued-token'),
      /must only be issued by a server response/,
    );
  } finally {
    cleanup();
  }
});

void test('clears the readable CSRF cookie without depending on in-memory state', () => {
  const cleanup = installDomEnvironment();
  try {
    document.cookie = `${CSRF_COOKIE_NAME}=server-issued-token; Path=/; SameSite=Strict`;

    csrfCredentialStore.clear();

    assert.equal(csrfCredentialStore.get(), null);
  } finally {
    cleanup();
  }
});
