import type { AdminHttpError } from './http-client';

export interface HttpFailurePublisher {
  publish(error: AdminHttpError): void;
}

export interface HttpFailureChannel extends HttpFailurePublisher {
  subscribe(listener: (error: AdminHttpError) => void): () => void;
}

export function createHttpFailureChannel(): HttpFailureChannel {
  const listeners = new Set<(error: AdminHttpError) => void>();
  return {
    publish(error) {
      for (const listener of listeners) listener(error);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const httpFailureChannel = createHttpFailureChannel();
