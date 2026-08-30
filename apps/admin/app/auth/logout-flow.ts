import type { AuthApi } from './auth-api';
import { applyCredentialPolicy, mapBootstrapFailure } from './auth-errors';
import type { AuthAction } from './auth-types';
import type { CsrfCredentialStore } from '../http/csrf-credential';

export async function performLogout(
  api: Pick<AuthApi, 'logout'>,
  credentials: CsrfCredentialStore,
  dispatch: (action: AuthAction) => void,
): Promise<void> {
  dispatch({ type: 'logout-started' });
  try {
    await api.logout();
  } catch (error) {
    const action = mapBootstrapFailure(error);
    applyCredentialPolicy(action, credentials);
    if (action.type === 'failed' && action.recoverable) {
      dispatch({ type: 'logout-failed', message: action.message });
    } else {
      dispatch(action);
    }
    throw error;
  }

  credentials.clear();
  dispatch({ type: 'unauthenticated' });
}
