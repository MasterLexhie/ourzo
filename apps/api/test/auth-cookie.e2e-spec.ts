import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { api, createTestApp, resetDatabase } from './utils/app';
import { TEST_PASSWORD, bearer } from './utils/tenant-fixture';

const COOKIE = 'ourzo_refresh';

/** Extracts "ourzo_refresh=<value>" and its attributes from Set-Cookie. */
function refreshCookie(headers: Record<string, unknown>): {
  pair: string;
  value: string;
  attributes: string;
} {
  const raw = headers['set-cookie'];
  const list: string[] = Array.isArray(raw)
    ? (raw as string[])
    : typeof raw === 'string'
      ? [raw]
      : [];
  const cookie = list.find((c) => c.startsWith(`${COOKIE}=`)) ?? '';
  const pair = cookie.split(';')[0];
  return { pair, value: pair.slice(COOKIE.length + 1), attributes: cookie };
}

describe('Refresh token in httpOnly cookie (e2e)', () => {
  let app: INestApplication;
  const email = `cookie-${randomUUID()}@e2e.test`;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    await api(app)
      .post('/api/auth/register')
      .send({
        email,
        password: TEST_PASSWORD,
        firstName: 'Cookie',
        lastName: 'E2e',
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  const login = () =>
    api(app)
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

  it('login sets a hardened cookie and never returns the refresh token in the body', async () => {
    const res = await login();
    const cookie = refreshCookie(res.headers);

    expect(cookie.value.length).toBeGreaterThan(20);
    expect(cookie.attributes).toMatch(/HttpOnly/i);
    expect(cookie.attributes).toMatch(/SameSite=Strict/i);
    expect(cookie.attributes).toMatch(/Path=\/api\/auth/);
    expect(cookie.attributes).toMatch(/Max-Age=604800/);
    expect(JSON.stringify(res.body)).not.toContain(cookie.value);
    expect(res.body).toMatchObject({ tokens: { tokenType: 'Bearer' } });
    expect(
      (res.body as { tokens: Record<string, unknown> }).tokens.refreshToken,
    ).toBeUndefined();
  });

  it('refresh rotates the cookie and the old token cannot be replayed', async () => {
    const first = refreshCookie((await login()).headers);

    const refreshed = await api(app)
      .post('/api/auth/refresh')
      .set('Cookie', first.pair)
      .expect(200);
    const second = refreshCookie(refreshed.headers);
    expect(second.value).not.toBe(first.value);
    const access = (refreshed.body as { accessToken: string }).accessToken;
    await api(app).get('/api/auth/me').set(bearer(access)).expect(200);

    await api(app)
      .post('/api/auth/refresh')
      .set('Cookie', first.pair)
      .expect(401);
    await api(app)
      .post('/api/auth/refresh')
      .set('Cookie', second.pair)
      .expect(200);
  });

  it('refresh without a cookie or token is 401', async () => {
    await api(app).post('/api/auth/refresh').expect(401);
  });

  it('still accepts the deprecated body token for one release', async () => {
    const { value } = refreshCookie((await login()).headers);
    await api(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: value })
      .expect(200);
  });

  it('logout revokes the session and clears the cookie', async () => {
    const res = await login();
    const cookie = refreshCookie(res.headers);
    const access = (res.body as { tokens: { accessToken: string } }).tokens
      .accessToken;

    const out = await api(app)
      .post('/api/auth/logout')
      .set(bearer(access))
      .set('Cookie', cookie.pair)
      .expect(200);
    const cleared = refreshCookie(out.headers);
    expect(cleared.value).toBe('');
    expect(cleared.attributes).toMatch(/Expires=Thu, 01 Jan 1970/);

    await api(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie.pair)
      .expect(401);
  });

  it('CORS allows credentials only for the configured origin', async () => {
    const allowed = await api(app)
      .options('/api/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await api(app)
      .options('/api/auth/refresh')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
