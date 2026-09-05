export interface CsrfCredentialStore {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

export const CSRF_COOKIE_NAME = 'admin_csrf_token';

export function createCsrfCredentialStore(): CsrfCredentialStore {
  let credential: string | null = null;
  return {
    get: () => credential,
    set(value) {
      credential = value;
    },
    clear() {
      credential = null;
    },
  };
}

function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return value === undefined ? null : value.slice(prefix.length);
}

export const csrfCredentialStore: CsrfCredentialStore = {
  get: () => readBrowserCookie(CSRF_COOKIE_NAME),
  set() {
    throw new Error('The CSRF cookie must only be issued by a server response.');
  },
  clear() {
    if (typeof document !== 'undefined') {
      document.cookie = `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict`;
    }
  },
};
