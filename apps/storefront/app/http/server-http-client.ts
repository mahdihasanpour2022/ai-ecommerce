import 'server-only';

import { getBackendApiUrl } from './server-api';

type ServerGetOptions = Omit<RequestInit, 'body' | 'headers' | 'method'>;

export class StorefrontServerHttpError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
  ) {
    super(`Storefront server request failed with status ${status}.`);
    this.name = 'StorefrontServerHttpError';
  }
}

function resolveBackendUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Storefront server requests require an application-relative Backend path.');
  }

  const baseUrl = new URL(`${getBackendApiUrl()}/`);
  const requestUrl = new URL(path.slice(1), baseUrl);

  if (
    requestUrl.origin !== baseUrl.origin ||
    !requestUrl.pathname.startsWith(baseUrl.pathname) ||
    requestUrl.hash !== ''
  ) {
    throw new Error('Storefront server request path escaped the configured Backend API boundary.');
  }

  return requestUrl.toString();
}

class StorefrontServerHttpClient {
  async get<Data>(path: string, options: ServerGetOptions = {}): Promise<Data> {
    const response = await fetch(resolveBackendUrl(path), {
      ...options,
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new StorefrontServerHttpError(response.status, response.statusText);
    }

    return (await response.json()) as Data;
  }
}

export const serverHttpClient = new StorefrontServerHttpClient();
