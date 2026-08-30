export interface CsrfCredentialStore {
  get(): string | null;
  set(value: string): void;
  clear(): void;
}

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

export const csrfCredentialStore = createCsrfCredentialStore();
