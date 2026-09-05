import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import test from 'node:test';

import { BootstrapAuthenticationService } from '../src/authentication/bootstrap-authentication.service';
import type { CurrentAuthentication } from '../src/authentication/authentication-context';
import { AuthenticationError } from '../src/authentication/authentication.errors';
import type { LoginSecurity } from '../src/authentication/login-security';
import type { ProtectedAuthenticationService } from '../src/authentication/protected-authentication.service';
import type {
  RefreshAuthenticationService,
  RefreshResult,
} from '../src/authentication/refresh-authentication.service';

const current: CurrentAuthentication = {
  sessionId: 'session-1',
  sessionExpiresAt: new Date('2026-09-12T00:00:00.000Z'),
  csrfTokenHash: new Uint8Array(32),
  admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'Admin' },
  roles: ['SUPER_ADMIN'],
  permissions: ['admin.access'],
};
const request = { method: 'POST', headers: {} } as IncomingMessage;

void test('uses valid Access plus the matching current Refresh session without rotation', async () => {
  let boundaryChecks = 0;
  let refreshes = 0;
  const service = new BootstrapAuthenticationService(
    {
      authenticateAccess: () => Promise.resolve(current),
      bootstrapCsrf: () => Promise.resolve({ csrfToken: 'csrf', authentication: current }),
    } as unknown as ProtectedAuthenticationService,
    {
      refreshForBootstrap: () => {
        refreshes += 1;
        return Promise.reject(new Error('must not refresh'));
      },
    } as unknown as RefreshAuthenticationService,
    {
      assertRequestBoundary: () => {
        boundaryChecks += 1;
      },
    } as unknown as LoginSecurity,
  );

  assert.deepEqual(await service.bootstrap(request), {
    authentication: current,
    csrfToken: 'csrf',
    credentials: null,
  });
  assert.equal(boundaryChecks, 1);
  assert.equal(refreshes, 0);
});

void test('recovers missing Access through the authoritative Refresh operation', async () => {
  const credentials = {
    accessToken: 'access',
    accessExpiresAt: new Date('2026-09-06T00:00:00.000Z'),
    refreshToken: 'refresh',
    sessionExpiresAt: current.sessionExpiresAt,
    authentication: current,
  } satisfies RefreshResult;
  const service = new BootstrapAuthenticationService(
    {
      authenticateAccess: () =>
        Promise.reject(new AuthenticationError(401, 'AUTHENTICATION_REQUIRED', '')),
      recoverCsrfToken: () => 'recovered-csrf',
    } as unknown as ProtectedAuthenticationService,
    {
      refreshForBootstrap: () => Promise.resolve(credentials),
    } as unknown as RefreshAuthenticationService,
    { assertRequestBoundary: () => undefined } as unknown as LoginSecurity,
  );

  assert.deepEqual(await service.bootstrap(request), {
    authentication: current,
    csrfToken: 'recovered-csrf',
    credentials,
  });
});

void test('never converts forbidden Access into a Refresh attempt', async () => {
  let refreshes = 0;
  const forbidden = new AuthenticationError(403, 'INSUFFICIENT_PERMISSION', 'forbidden');
  const service = new BootstrapAuthenticationService(
    {
      authenticateAccess: () => Promise.reject(forbidden),
    } as unknown as ProtectedAuthenticationService,
    {
      refreshForBootstrap: () => {
        refreshes += 1;
        return Promise.reject(new Error('must not refresh'));
      },
    } as unknown as RefreshAuthenticationService,
    { assertRequestBoundary: () => undefined } as unknown as LoginSecurity,
  );

  await assert.rejects(service.bootstrap(request), (error) => error === forbidden);
  assert.equal(refreshes, 0);
});

void test('fails closed when Access and Refresh identify different sessions', async () => {
  const other = { ...current, sessionId: 'session-2' };
  let refreshes = 0;
  const service = new BootstrapAuthenticationService(
    {
      authenticateAccess: () => Promise.resolve(current),
      bootstrapCsrf: () => Promise.resolve({ csrfToken: 'csrf', authentication: other }),
    } as unknown as ProtectedAuthenticationService,
    {
      refreshForBootstrap: () => {
        refreshes += 1;
        return Promise.reject(new Error('must not refresh'));
      },
    } as unknown as RefreshAuthenticationService,
    { assertRequestBoundary: () => undefined } as unknown as LoginSecurity,
  );

  await assert.rejects(
    service.bootstrap(request),
    (error: unknown) =>
      error instanceof AuthenticationError && error.code === 'AUTHENTICATION_REQUIRED',
  );
  assert.equal(refreshes, 0);
});
