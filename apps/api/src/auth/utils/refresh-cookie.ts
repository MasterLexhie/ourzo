import type { Request, Response } from 'express';

/**
 * Refresh-token cookie (ADR-010).
 *
 * httpOnly keeps the token away from JavaScript (XSS), SameSite=Strict plus
 * the narrow /api/auth path limits where the browser ever sends it (CSRF).
 */
export const REFRESH_COOKIE_NAME = 'ourzo_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Minimal Cookie header parser (avoids a cookie-parser dependency). */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name || name in cookies) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function readRefreshCookie(request: Request): string | undefined {
  return parseCookies(request.headers.cookie)[REFRESH_COOKIE_NAME] || undefined;
}

export function setRefreshCookie(
  response: Response,
  refreshToken: string,
  maxAgeSeconds: number,
  secure: boolean,
): void {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSeconds * 1000,
  });
}

export function clearRefreshCookie(response: Response, secure: boolean): void {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  });
}
