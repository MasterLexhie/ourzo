import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request context, propagated across async calls via AsyncLocalStorage.
 * Populated by RequestContextMiddleware; enriched by auth guards.
 */
export interface RequestContextStore {
  /** Set when the request authenticated with an API key instead of a JWT. */
  apiKeyId?: string;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContextStore>();

export const getRequestContext = (): RequestContextStore | undefined =>
  requestContextStorage.getStore();
