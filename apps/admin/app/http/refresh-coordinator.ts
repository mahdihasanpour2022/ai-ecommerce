import type { AxiosInstance } from 'axios';
import type { AdminHttpError } from './http-client';

export interface RefreshCoordinator {
  recover(): Promise<void>;
}

function isTransportFailure(error: unknown): error is AdminHttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    (error.kind === 'network' || error.kind === 'timeout')
  );
}

export function requestSessionRefresh(client: AxiosInstance): Promise<void> {
  return client
    .post('/auth/refresh', undefined, {
      authPolicy: { csrf: 'required', failure: 'caller', refresh: 'never' },
      authRecoveryAttempted: true,
    })
    .then(() => undefined);
}

export function createRefreshCoordinator(refresh: () => Promise<void>): RefreshCoordinator {
  let active: Promise<void> | null = null;

  async function execute(): Promise<void> {
    try {
      await refresh();
    } catch (error) {
      if (!isTransportFailure(error)) throw error;
      await refresh();
    }
  }

  return {
    recover() {
      if (active) return active;
      const operation = execute().finally(() => {
        if (active === operation) active = null;
      });
      active = operation;
      return operation;
    },
  };
}
