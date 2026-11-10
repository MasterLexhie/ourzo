import { INestApplication } from '@nestjs/common';
import { api, createTestApp, resetDatabase } from './utils/app';
import {
  TenantFixture,
  asUser,
  bearer,
  createTenant,
  secretsOf,
} from './utils/tenant-fixture';

/**
 * High-Risk Rule #5: every tenant-owned resource is covered against the three
 * attacker paths. Workspace A is the victim, workspace B the attacker.
 *
 *  1. User B, B's workspace header, A's resource id      -> 404 (indistinguishable from missing)
 *  2. User B with A's workspace header                    -> 403 (not a member)
 *  3. API key of B against A (header -> 403, bare id -> 404)
 *
 * Every response is also checked to contain none of A's identifiers.
 */
type Method = 'get' | 'patch' | 'delete' | 'post';

interface Probe {
  resource: string;
  method: Method;
  path: (a: TenantFixture) => string;
  body?: (a: TenantFixture) => object;
  /** Whether the route is reachable with an API key at all. */
  keyCapable: boolean;
}

// Route templates used only for readable test names.
const PLACEHOLDERS = {
  projectId: ':projectId',
  taskId: ':taskId',
  member: { id: ':userId' },
  notificationId: ':notificationId',
  apiKey: { id: ':keyId' },
  pendingInvitationId: ':invitationId',
} as unknown as TenantFixture;

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let A: TenantFixture;
  let B: TenantFixture;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    A = await createTenant(app, 'Alpha');
    B = await createTenant(app, 'Beta');
  });

  afterAll(async () => {
    await app.close();
  });

  const expectNoLeak = (body: unknown) => {
    // The error filter echoes the request path, i.e. the id the caller already
    // supplied; it is not data disclosed by the server, so it is excluded.
    const rest = { ...((body ?? {}) as Record<string, unknown>) };
    delete rest.path;
    const text = JSON.stringify(rest);
    for (const secret of secretsOf(A)) {
      expect(text).not.toContain(secret);
    }
  };

  const send = (probe: Probe, headers: Record<string, string>) => {
    const req = api(app)[probe.method](probe.path(A)).set(headers);
    return probe.body ? req.send(probe.body(A)) : req;
  };

  // Resource-id probes: A's ids presented from B's context.
  const idProbes: Probe[] = [
    {
      resource: 'projects',
      method: 'get',
      path: (a) => `/api/projects/${a.projectId}`,
      keyCapable: true,
    },
    {
      resource: 'projects',
      method: 'patch',
      path: (a) => `/api/projects/${a.projectId}`,
      body: () => ({ name: 'pwned' }),
      keyCapable: true,
    },
    {
      resource: 'projects',
      method: 'delete',
      path: (a) => `/api/projects/${a.projectId}`,
      keyCapable: true,
    },
    {
      resource: 'projects',
      method: 'get',
      path: (a) => `/api/projects/${a.projectId}/progress`,
      keyCapable: true,
    },
    {
      resource: 'projects',
      method: 'post',
      path: (a) => `/api/projects/${a.projectId}/members`,
      body: (a) => ({ userIds: [a.member.id] }),
      keyCapable: true,
    },
    {
      resource: 'tasks',
      method: 'get',
      path: (a) => `/api/tasks/${a.taskId}`,
      keyCapable: true,
    },
    {
      resource: 'tasks',
      method: 'patch',
      path: (a) => `/api/tasks/${a.taskId}`,
      body: () => ({ status: 'completed' }),
      keyCapable: true,
    },
    {
      resource: 'tasks',
      method: 'delete',
      path: (a) => `/api/tasks/${a.taskId}`,
      keyCapable: true,
    },
    {
      resource: 'tasks',
      method: 'get',
      path: (a) => `/api/tasks?projectId=${a.projectId}`,
      keyCapable: true,
    },
    {
      resource: 'memberships',
      method: 'patch',
      path: (a) => `/api/members/${a.member.id}/role`,
      body: () => ({ role: 'admin' }),
      keyCapable: false,
    },
    {
      resource: 'memberships',
      method: 'delete',
      path: (a) => `/api/members/${a.member.id}`,
      keyCapable: false,
    },
    {
      resource: 'notifications',
      method: 'patch',
      path: (a) => `/api/notifications/${a.notificationId}/read`,
      keyCapable: false,
    },
    {
      resource: 'api keys',
      method: 'get',
      path: (a) => `/api/api-keys/${a.apiKey.id}`,
      keyCapable: false,
    },
    {
      resource: 'api keys',
      method: 'delete',
      path: (a) => `/api/api-keys/${a.apiKey.id}`,
      keyCapable: false,
    },
    {
      resource: 'invitations',
      method: 'delete',
      path: (a) => `/api/invitations/${a.pendingInvitationId}`,
      keyCapable: false,
    },
  ];

  // Collection probes: A's workspace targeted directly.
  const workspaceProbes: Probe[] = [
    {
      resource: 'projects',
      method: 'get',
      path: () => '/api/projects',
      keyCapable: true,
    },
    {
      resource: 'tasks',
      method: 'get',
      path: (a) => `/api/tasks?projectId=${a.projectId}`,
      keyCapable: true,
    },
    {
      resource: 'memberships',
      method: 'get',
      path: () => '/api/members',
      keyCapable: true,
    },
    {
      resource: 'usage',
      method: 'get',
      path: () => '/api/usage',
      keyCapable: true,
    },
    {
      resource: 'notifications',
      method: 'get',
      path: () => '/api/notifications',
      keyCapable: false,
    },
    {
      resource: 'audit logs',
      method: 'get',
      path: () => '/api/audit',
      keyCapable: true,
    },
    {
      resource: 'api keys',
      method: 'get',
      path: () => '/api/api-keys',
      keyCapable: false,
    },
  ];

  describe('path 1: user B + own workspace + A resource id -> 404', () => {
    it.each(
      idProbes.map((p) => [
        `${p.resource} ${p.method.toUpperCase()} ${p.path(PLACEHOLDERS)}`,
        p,
      ]),
    )('%s', async (_name, probe) => {
      const res = await send(probe, asUser(B.owner, B.workspaceId));
      expect({ status: res.status, body: res.body as unknown }).toMatchObject({
        status: 404,
      });
      expectNoLeak(res.body);
    });
  });

  describe('path 2: user B + A workspace header -> 403', () => {
    it.each(
      workspaceProbes.map((p) => [
        `${p.resource} ${p.method.toUpperCase()}`,
        p,
      ]),
    )('%s', async (_name, probe) => {
      const res = await send(probe, asUser(B.owner, A.workspaceId));
      expect({ status: res.status, body: res.body as unknown }).toMatchObject({
        status: 403,
      });
      expectNoLeak(res.body);
    });
  });

  describe('path 3: API key of B', () => {
    const keyProbes = [...workspaceProbes, ...idProbes].filter(
      (p) => p.keyCapable,
    );

    it.each(
      keyProbes.map((p) => [
        `${p.resource} ${p.method.toUpperCase()} with A header`,
        p,
      ]),
    )('%s -> 403', async (_name, probe) => {
      const res = await send(probe, {
        ...bearer(B.apiKey.key),
        'X-Workspace-Id': A.workspaceId,
      });
      expect({ status: res.status, body: res.body as unknown }).toMatchObject({
        status: 403,
      });
      expectNoLeak(res.body);
    });

    it.each(
      idProbes
        .filter((p) => p.keyCapable)
        .map((p) => [`${p.resource} ${p.method.toUpperCase()}`, p]),
    )('%s with A id (no header) -> 404', async (_name, probe) => {
      const res = await send(probe, bearer(B.apiKey.key));
      expect({ status: res.status, body: res.body as unknown }).toMatchObject({
        status: 404,
      });
      expectNoLeak(res.body);
    });

    it('cannot reach JWT-only resources of A at all', async () => {
      for (const path of [
        '/api/notifications',
        '/api/api-keys',
        '/api/invitations',
      ]) {
        const res = await api(app)
          .get(path)
          .set({ ...bearer(B.apiKey.key), 'X-Workspace-Id': A.workspaceId });
        expect({ status: res.status, body: res.body as unknown }).toMatchObject(
          { status: 401 },
        );
        expectNoLeak(res.body);
      }
    });
  });

  describe("B's own listings never include A's data", () => {
    it.each(workspaceProbes.map((p) => [`${p.resource}`, p]))(
      '%s',
      async (_name, probe) => {
        // Tasks listing is project-scoped: list B's own project instead.
        const path =
          probe.resource === 'tasks'
            ? `/api/tasks?projectId=${B.projectId}`
            : probe.path(A);
        const res = await api(app)
          .get(path)
          .set(asUser(B.owner, B.workspaceId));
        expect({ status: res.status, body: res.body as unknown }).toMatchObject(
          { status: 200 },
        );
        expectNoLeak(res.body);
      },
    );
  });

  it("A's data is intact after all attacks", async () => {
    const project = await api(app)
      .get(`/api/projects/${A.projectId}`)
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    expect((project.body as { name: string }).name).toBe(A.projectName);

    const task = await api(app)
      .get(`/api/tasks/${A.taskId}`)
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    expect((task.body as { status: string }).status).toBe('todo');

    const keys = await api(app)
      .get('/api/api-keys')
      .set(asUser(A.owner, A.workspaceId));
    expect({ status: keys.status, body: keys.body as unknown }).toMatchObject({
      status: 200,
    });
    expect(
      (keys.body as { apiKeys: Array<{ id: string }> }).apiKeys.map(
        (k) => k.id,
      ),
    ).toContain(A.apiKey.id);

    const members = await api(app)
      .get('/api/members')
      .set(asUser(A.owner, A.workspaceId))
      .expect(200);
    expect(JSON.stringify(members.body)).toContain(A.member.id);
  });
});
