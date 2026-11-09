import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { api, createTestApp, resetDatabase } from './utils/app';
import {
  TEST_PASSWORD,
  TenantFixture,
  addMember,
  asUser,
  bearer,
  createTenant,
  registerUser,
} from './utils/tenant-fixture';

/** Happy-path and validation behaviour of the core MVP journeys. */
describe('Core workflows (e2e)', () => {
  let app: INestApplication;
  let T: TenantFixture;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    T = await createTenant(app, 'Flow');
  });

  afterAll(async () => {
    await app.close();
  });

  const owner = () => asUser(T.owner, T.workspaceId);
  const member = () => asUser(T.member, T.workspaceId);

  describe('authentication', () => {
    it('rejects duplicate registration and bad credentials', async () => {
      await api(app)
        .post('/api/auth/register')
        .send({
          email: T.owner.email,
          password: TEST_PASSWORD,
          firstName: 'Dup',
          lastName: 'User',
        })
        .expect(409);
      await api(app)
        .post('/api/auth/login')
        .send({ email: T.owner.email, password: 'wrong-password-123' })
        .expect(401);
      await api(app)
        .post('/api/auth/login')
        .send({
          email: `ghost-${randomUUID()}@e2e.test`,
          password: TEST_PASSWORD,
        })
        .expect(401);
    });

    it('returns the current user from /me and rejects missing tokens', async () => {
      const me = await api(app)
        .get('/api/auth/me')
        .set(bearer(T.owner.accessToken))
        .expect(200);
      expect((me.body as { id: string }).id).toBe(T.owner.id);
      await api(app).get('/api/auth/me').expect(401);
    });
  });

  describe('projects', () => {
    it('updates a project and reports progress', async () => {
      const updated = await api(app)
        .patch(`/api/projects/${T.projectId}`)
        .set(owner())
        .send({ status: 'in_progress', description: 'Now running' })
        .expect(200);
      expect(updated.body).toMatchObject({
        status: 'in_progress',
        description: 'Now running',
      });

      const progress = await api(app)
        .get(`/api/projects/${T.projectId}/progress`)
        .set(owner())
        .expect(200);
      expect(progress.body).toMatchObject({ totalTasks: 1 });

      const list = await api(app)
        .get('/api/projects?status=in_progress')
        .set(owner())
        .expect(200);
      expect(
        (list.body as { projects: Array<{ id: string }> }).projects.map(
          (p) => p.id,
        ),
      ).toEqual([T.projectId]);
    });

    it('rejects invalid project status values', async () => {
      await api(app)
        .patch(`/api/projects/${T.projectId}`)
        .set(owner())
        .send({ status: 'cancelled' })
        .expect(400);
    });

    it('adds and removes project members; non-members lose access', async () => {
      const extra = await registerUser(app, 'Extra');
      await addMember(app, T.owner, T.workspaceId, extra);
      const asExtra = asUser(extra, T.workspaceId);

      await api(app)
        .get(`/api/projects/${T.projectId}`)
        .set(asExtra)
        .expect(403);
      await api(app)
        .post(`/api/projects/${T.projectId}/members`)
        .set(owner())
        .send({ userIds: [extra.id] })
        .expect(200);
      await api(app)
        .get(`/api/projects/${T.projectId}`)
        .set(asExtra)
        .expect(200);

      await api(app)
        .delete(`/api/projects/${T.projectId}/members/${extra.id}`)
        .set(owner())
        .expect(200);
      await api(app)
        .get(`/api/projects/${T.projectId}`)
        .set(asExtra)
        .expect(403);
      await api(app)
        .delete(`/api/projects/${T.projectId}/members/${extra.id}`)
        .set(owner())
        .expect(404);
    });
  });

  describe('tasks', () => {
    it('moves a task through statuses including blocked and rejects cancelled', async () => {
      for (const status of ['in_progress', 'blocked', 'completed']) {
        const res = await api(app)
          .patch(`/api/tasks/${T.taskId}`)
          .set(member())
          .send({ status })
          .expect(200);
        expect((res.body as { status: string }).status).toBe(status);
      }
      await api(app)
        .patch(`/api/tasks/${T.taskId}`)
        .set(member())
        .send({ status: 'cancelled' })
        .expect(400);
    });

    it('filters, reassigns and deletes tasks', async () => {
      const created = await api(app)
        .post('/api/tasks')
        .set(owner())
        .send({
          projectId: T.projectId,
          title: 'Temporary',
          priority: 'urgent',
        })
        .expect(201);
      const id = (created.body as { id: string }).id;

      const urgent = await api(app)
        .get(`/api/tasks?projectId=${T.projectId}&priority=urgent`)
        .set(owner())
        .expect(200);
      expect(
        (urgent.body as { tasks: Array<{ id: string }> }).tasks.map(
          (t) => t.id,
        ),
      ).toEqual([id]);

      await api(app)
        .patch(`/api/tasks/${id}`)
        .set(owner())
        .send({ assigneeId: T.member.id })
        .expect(200);
      const outsider = await registerUser(app, 'Outsider');
      await api(app)
        .patch(`/api/tasks/${id}`)
        .set(owner())
        .send({ assigneeId: outsider.id })
        .expect(400);

      await api(app).delete(`/api/tasks/${id}`).set(member()).expect(403);
      await api(app).delete(`/api/tasks/${id}`).set(owner()).expect(200);
      await api(app).get(`/api/tasks/${id}`).set(owner()).expect(404);
    });
  });

  describe('notifications', () => {
    it('lists, marks one and marks all notifications as read', async () => {
      const before = await api(app)
        .get('/api/notifications')
        .set(member())
        .expect(200);
      const body = before.body as {
        notifications: Array<{ id: string }>;
        unreadCount: number;
      };
      expect(body.unreadCount).toBeGreaterThan(0);

      await api(app)
        .patch(`/api/notifications/${T.notificationId}/read`)
        .set(member())
        .expect(200);
      await api(app)
        .patch('/api/notifications/read-all')
        .set(member())
        .expect(200);

      const after = await api(app)
        .get('/api/notifications')
        .set(member())
        .expect(200);
      expect((after.body as { unreadCount: number }).unreadCount).toBe(0);
    });
  });

  describe('invitations', () => {
    it('lists pending invitations without tokens and revokes them', async () => {
      const list = await api(app)
        .get('/api/invitations')
        .set(owner())
        .expect(200);
      expect(JSON.stringify(list.body)).not.toMatch(/"token"/);

      await api(app)
        .delete(`/api/invitations/${T.pendingInvitationId}`)
        .set(owner())
        .expect(200);
      await api(app)
        .delete(`/api/invitations/${T.pendingInvitationId}`)
        .set(owner())
        .expect(400);
    });

    it('refuses an invitation accepted by a different account', async () => {
      const invite = await api(app)
        .post('/api/invitations')
        .set(owner())
        .send({ email: `someone-${randomUUID()}@e2e.test`, role: 'member' })
        .expect(201);
      const token = new URL(
        (invite.body as { inviteUrl: string }).inviteUrl,
      ).searchParams.get('token');
      const wrong = await registerUser(app, 'Wrong');
      await api(app)
        .post('/api/invitations/accept')
        .set(bearer(wrong.accessToken))
        .send({ token })
        .expect(403);
    });
  });

  describe('workspace lifecycle', () => {
    it('reads, renames and transfers ownership', async () => {
      const ws = await api(app)
        .get(`/api/organizations/${T.workspaceId}`)
        .set(owner())
        .expect(200);
      expect((ws.body as { name: string }).name).toBe(T.workspaceName);

      const mine = await api(app)
        .get('/api/organizations')
        .set(bearer(T.owner.accessToken))
        .expect(200);
      expect(JSON.stringify(mine.body)).toContain(T.workspaceId);

      await api(app)
        .post('/api/members/transfer-ownership')
        .set(owner())
        .send({ userId: T.member.id })
        .expect(200);
      const members = await api(app)
        .get('/api/members')
        .set(member())
        .expect(200);
      const roles = Object.fromEntries(
        (
          members.body as { members: Array<{ userId: string; role: string }> }
        ).members.map((m) => [m.userId, m.role]),
      );
      expect(roles[T.member.id]).toBe('owner');
    });

    it('soft-deletes a workspace, after which it is gone', async () => {
      const ws = await api(app)
        .post('/api/organizations')
        .set(bearer(T.owner.accessToken))
        .send({
          name: 'Short lived',
          slug: `short-${randomUUID().slice(0, 8)}`,
        })
        .expect(201);
      const id = (ws.body as { id: string }).id;
      const headers = asUser(T.owner, id);
      await api(app)
        .delete(`/api/organizations/${id}`)
        .set(headers)
        .expect(200);
      await api(app).get('/api/projects').set(headers).expect(404);
    });

    it('rejects duplicate workspace slugs', async () => {
      const slug = `dup-${randomUUID().slice(0, 8)}`;
      await api(app)
        .post('/api/organizations')
        .set(bearer(T.owner.accessToken))
        .send({ name: 'One', slug })
        .expect(201);
      await api(app)
        .post('/api/organizations')
        .set(bearer(T.owner.accessToken))
        .send({ name: 'Two', slug })
        .expect(409);
    });
  });

  it('health reports database and redis status', async () => {
    const res = await api(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
