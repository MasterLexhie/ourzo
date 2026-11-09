import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { api, createTestApp, resetDatabase } from './utils/app';
import {
  TestUser,
  addMember,
  asUser,
  bearer,
  registerUser,
} from './utils/tenant-fixture';

type Role = 'owner' | 'admin' | 'member';

/**
 * Workspace RBAC matrix (Owner / Admin / Member) for the privileged
 * operations named in AGENTS.md, plus self-promotion and last-owner rules.
 */
describe('RBAC matrix (e2e)', () => {
  let app: INestApplication;
  let workspaceId: string;
  const users = {} as Record<Role | 'target', TestUser>;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);

    users.owner = await registerUser(app, 'Owner');
    users.admin = await registerUser(app, 'Admin');
    users.member = await registerUser(app, 'Member');
    users.target = await registerUser(app, 'Target');

    const ws = await api(app)
      .post('/api/organizations')
      .set(bearer(users.owner.accessToken))
      .send({ name: 'RBAC Co', slug: `rbac-${randomUUID().slice(0, 8)}` })
      .expect(201);
    workspaceId = (ws.body as { id: string }).id;

    await addMember(app, users.owner, workspaceId, users.admin, 'admin');
    await addMember(app, users.owner, workspaceId, users.member, 'member');
    await addMember(app, users.owner, workspaceId, users.target, 'member');
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (role: Role) => asUser(users[role], workspaceId);

  const roleOf = async (userId: string): Promise<string | undefined> => {
    const res = await api(app).get('/api/members').set(as('owner')).expect(200);
    return (
      res.body as { members: Array<{ userId: string; role: string }> }
    ).members.find((m) => m.userId === userId)?.role;
  };

  const matrix: Array<{
    action: string;
    expected: Record<Role, number>;
    run: (role: Role) => Promise<number>;
  }> = [
    {
      action: 'change a member role',
      expected: { owner: 200, admin: 200, member: 403 },
      run: async (role) =>
        (
          await api(app)
            .patch(`/api/members/${users.target.id}/role`)
            .set(as(role))
            .send({ role: 'member' })
        ).status,
    },
    {
      action: 'invite a member',
      expected: { owner: 201, admin: 201, member: 403 },
      run: async (role) =>
        (
          await api(app)
            .post('/api/invitations')
            .set(as(role))
            .send({ email: `invitee-${randomUUID()}@e2e.test`, role: 'member' })
        ).status,
    },
    {
      action: 'update workspace settings',
      expected: { owner: 200, admin: 200, member: 403 },
      run: async (role) =>
        (
          await api(app)
            .patch(`/api/organizations/${workspaceId}`)
            .set(as(role))
            .send({ name: `RBAC Co (${role})` })
        ).status,
    },
    {
      action: 'archive a project',
      expected: { owner: 200, admin: 200, member: 403 },
      run: async (role) => {
        const project = await api(app)
          .post('/api/projects')
          .set(as('owner'))
          .send({ name: `Archive me (${role})` })
          .expect(201);
        const id = (project.body as { id: string }).id;
        const res = await api(app).delete(`/api/projects/${id}`).set(as(role));
        if (res.status !== 200) {
          // keep the plan's project quota free for later cases
          await api(app)
            .delete(`/api/projects/${id}`)
            .set(as('owner'))
            .expect(200);
        }
        return res.status;
      },
    },
    {
      action: 'create an API key',
      expected: { owner: 201, admin: 403, member: 403 },
      run: async (role) =>
        (
          await api(app)
            .post('/api/api-keys')
            .set(as(role))
            .send({ name: `key-${role}`, scopes: [{ scope: 'projects:read' }] })
        ).status,
    },
  ];

  describe.each(matrix)('$action', ({ expected, run }) => {
    it.each(['owner', 'admin', 'member'] as Role[])('as %s', async (role) => {
      expect(await run(role)).toBe(expected[role]);
    });
  });

  describe('privilege escalation', () => {
    it('a member cannot promote themselves', async () => {
      const res = await api(app)
        .patch(`/api/members/${users.member.id}/role`)
        .set(as('member'))
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
      expect(await roleOf(users.member.id)).toBe('member');
    });

    it('an admin cannot change their own role', async () => {
      const res = await api(app)
        .patch(`/api/members/${users.admin.id}/role`)
        .set(as('admin'))
        .send({ role: 'owner' });
      expect([400, 403]).toContain(res.status);
      expect(await roleOf(users.admin.id)).toBe('admin');
    });

    it('an admin cannot promote another member to owner', async () => {
      const res = await api(app)
        .patch(`/api/members/${users.target.id}/role`)
        .set(as('admin'))
        .send({ role: 'owner' });
      expect(res.status).toBe(403);
      expect(await roleOf(users.target.id)).toBe('member');
    });

    it('an admin cannot change or remove the owner', async () => {
      const change = await api(app)
        .patch(`/api/members/${users.owner.id}/role`)
        .set(as('admin'))
        .send({ role: 'member' });
      const remove = await api(app)
        .delete(`/api/members/${users.owner.id}`)
        .set(as('admin'));
      expect(change.status).toBe(403);
      expect(remove.status).toBe(403);
      expect(await roleOf(users.owner.id)).toBe('owner');
    });
  });

  describe('last owner protection', () => {
    it('the only owner cannot remove themselves', async () => {
      const res = await api(app)
        .delete(`/api/members/${users.owner.id}`)
        .set(as('owner'));
      expect([400, 403]).toContain(res.status);
      expect(await roleOf(users.owner.id)).toBe('owner');
    });

    it('the only owner cannot demote themselves', async () => {
      const res = await api(app)
        .patch(`/api/members/${users.owner.id}/role`)
        .set(as('owner'))
        .send({ role: 'admin' });
      expect([400, 403]).toContain(res.status);
      expect(await roleOf(users.owner.id)).toBe('owner');
    });
  });
});
