import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { api, createTestApp, resetDatabase } from './utils/app';
import {
  TEST_PASSWORD,
  TenantFixture,
  asUser,
  bearer,
  createTenant,
} from './utils/tenant-fixture';

async function clearRateLimitKeys(): Promise<void> {
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    lazyConnect: true,
  });
  await redis.connect();
  const keys = await redis.keys('ratelimit:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.quit();
}

describe('API keys (e2e)', () => {
  let app: INestApplication;
  let A: TenantFixture;
  let readKey: { id: string; key: string };

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    A = await createTenant(app, 'Keys');
    const res = await api(app)
      .post('/api/api-keys')
      .set(asUser(A.owner, A.workspaceId))
      .send({ name: 'read-only', scopes: [{ scope: 'projects:read' }] })
      .expect(201);
    readKey = res.body as { id: string; key: string };
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues keys in the ourzo_<8>_<32> format and never returns them again', async () => {
    expect(readKey.key).toMatch(/^ourzo_[a-z0-9]{8}_[a-z0-9]{32}$/);
    const list = await api(app)
      .get('/api/api-keys')
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain(readKey.key);
  });

  it('read scope allows reads and rejects writes', async () => {
    await api(app).get('/api/projects').set(bearer(readKey.key)).expect(200);
    const write = await api(app)
      .post('/api/projects')
      .set(bearer(readKey.key))
      .send({ name: 'nope' });
    expect(write.status).toBe(403);
  });

  it('routes without a declared scope are closed to keys', async () => {
    const res = await api(app)
      .patch(`/api/members/${A.member.id}/role`)
      .set(bearer(A.apiKey.key))
      .send({ role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('JWT-only routes reject keys with 401', async () => {
    for (const path of [
      '/api/invitations',
      '/api/api-keys',
      '/api/notifications',
      '/api/organizations',
    ]) {
      await api(app)
        .get(path)
        .set({ ...bearer(A.apiKey.key), 'X-Workspace-Id': A.workspaceId })
        .expect(401);
    }
  });

  it('unknown and malformed keys are rejected with 401', async () => {
    await api(app)
      .get('/api/projects')
      .set(bearer(`ourzo_aaaaaaaa_${'b'.repeat(32)}`))
      .expect(401);
    await api(app).get('/api/projects').set(bearer('ourzo_bad')).expect(401);
  });

  it('writes made with a key are audited as via=api_key on behalf of the creator', async () => {
    const created = await api(app)
      .post('/api/tasks')
      .set(bearer(A.apiKey.key))
      .send({ projectId: A.projectId, title: 'via key' })
      .expect(201);
    const taskId = (created.body as { id: string }).id;

    const audit = await api(app)
      .get('/api/audit?action=task.created')
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    const entry = (
      audit.body as {
        auditLogs: Array<{
          resourceId: string;
          actorId: string;
          metadata: Record<string, unknown>;
        }>;
      }
    ).auditLogs.find((l) => l.resourceId === taskId);
    expect(entry?.actorId).toBe(A.owner.id);
    expect(entry?.metadata).toMatchObject({
      via: 'api_key',
      apiKeyId: A.apiKey.id,
    });
  });

  it('a revoked key is rejected with 401', async () => {
    await api(app)
      .delete(`/api/api-keys/${readKey.id}`)
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    await api(app).get('/api/projects').set(bearer(readKey.key)).expect(401);
  });

  it('a key stops working when its creator leaves the workspace', async () => {
    // Promote the member to owner, let them mint a key, then remove them.
    const owner2 = A.member;
    await api(app)
      .patch(`/api/members/${owner2.id}/role`)
      .set(asUser(A.owner, A.workspaceId))
      .send({ role: 'owner' })
      .expect(200);
    const key = await api(app)
      .post('/api/api-keys')
      .set(asUser(owner2, A.workspaceId))
      .send({ name: 'leaver', scopes: [{ scope: 'projects:read' }] })
      // 2 active keys allowed on free; the read-only key was revoked above
      .expect(201);
    const leaverKey = (key.body as { key: string }).key;
    await api(app).get('/api/projects').set(bearer(leaverKey)).expect(200);

    await api(app)
      .patch(`/api/members/${owner2.id}/role`)
      .set(asUser(A.owner, A.workspaceId))
      .send({ role: 'member' });
    await api(app)
      .delete(`/api/members/${owner2.id}`)
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    await api(app).get('/api/projects').set(bearer(leaverKey)).expect(403);
  });
});

describe('Auth rate limiting (e2e)', () => {
  let app: INestApplication;
  const previous = process.env.RATE_LIMIT_AUTH_MAX;

  beforeAll(async () => {
    process.env.RATE_LIMIT_AUTH_MAX = '3';
    await clearRateLimitKeys();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    process.env.RATE_LIMIT_AUTH_MAX = previous;
    await clearRateLimitKeys();
  });

  it('allows the limit, then returns 429 with Retry-After', async () => {
    const attempt = () =>
      api(app)
        .post('/api/auth/login')
        .send({
          email: `nobody-${randomUUID()}@e2e.test`,
          password: TEST_PASSWORD,
        });

    for (let i = 0; i < 3; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
      expect(res.headers['x-ratelimit-remaining']).toBe(String(2 - i));
    }

    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });
});
