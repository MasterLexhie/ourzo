import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Named rate-limit policies. Limits are resolved from environment variables
 * at runtime by RateLimitGuard (see docs/architecture/usage-and-limits.md):
 *
 * - `auth`:    per client IP, fails CLOSED if Redis is unavailable
 *              (RATE_LIMIT_AUTH_MAX / RATE_LIMIT_AUTH_WINDOW_MS)
 * - `user`:    per authenticated user, fails open
 *              (RATE_LIMIT_DEFAULT_MAX / RATE_LIMIT_WINDOW_MS)
 * - `api-key`: per API key, fails open; applied automatically instead of
 *              `user` when the request authenticated with an API key
 *              (RATE_LIMIT_API_KEY_MAX / RATE_LIMIT_WINDOW_MS)
 */
export type RateLimitPolicy = 'auth' | 'user' | 'api-key';

export interface RateLimitMetadata {
  policy: RateLimitPolicy;
}

export const RateLimit = (policy: RateLimitPolicy) =>
  SetMetadata(RATE_LIMIT_KEY, { policy } satisfies RateLimitMetadata);

export const AuthRateLimit = () => RateLimit('auth');

export const UserRateLimit = () => RateLimit('user');
