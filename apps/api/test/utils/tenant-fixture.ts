import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { api } from './app';

export const TEST_PASSWORD = 'E2e-Test-Passw0rd!';

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

export interface TenantFixture {
  label: string;
  workspaceId: string;
  workspaceName: string;
  owner: TestUser;
  member: TestUser;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  notificationId: string;
  pendingInvitationId: string;
  apiKey: { id: string; key: string };
}

interface AuthBody {
  user: { id: string; email: string };
  accessToken?: string;
  tokens?: { accessToken: string };
}

const accessTokenOf = (body: AuthBody): string =>
  body.accessToken ?? body.tokens?.accessToken ?? '';

export async function registerUser(
  app: INestApplication,
  firstName: string,
): Promise<TestUser> {
  const email = `${firstName.toLowerCase()}-${randomUUID()}@e2e.test`;
  const res = await api(app)
    .post('/api/auth/register')
    .send({ email, password: TEST_PASSWORD, firstName, lastName: 'E2e' })
    .expect(201);
  const body = res.body as AuthBody;
  return { id: body.user.id, email, accessToken: accessTokenOf(body) };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export const asUser = (user: TestUser, workspaceId?: string) => ({
  ...bearer(user.accessToken),
  ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
});

/** Adds a user to a workspace through the real invitation flow. */
export async function addMember(
  app: INestApplication,
  owner: TestUser,
  workspaceId: string,
  user: TestUser,
  role: 'admin' | 'member' = 'member',
): Promise<void> {
  const invite = await api(app)
    .post('/api/invitations')
    .set(asUser(owner, workspaceId))
    .send({ email: user.email, role })
    .expect(201);
  const token = new URL(
    (invite.body as { inviteUrl: string }).inviteUrl,
  ).searchParams.get('token');
  await api(app)
    .post('/api/invitations/accept')
    .set(bearer(user.accessToken))
    .send({ token })
    .expect(200);
}

/**
 * Creates one fully populated tenant: owner + member, a project, a task
 * assigned to the member (which produces a notification), a pending
 * invitation, an all-scope API key and the resulting audit entries.
 */
export async function createTenant(
  app: INestApplication,
  label: string,
): Promise<TenantFixture> {
  const owner = await registerUser(app, `${label}Owner`);
  const member = await registerUser(app, `${label}Member`);
  const workspaceName = `Workspace ${label}`;

  const ws = await api(app)
    .post('/api/organizations')
    .set(bearer(owner.accessToken))
    .send({
      name: workspaceName,
      slug: `ws-${label.toLowerCase()}-${randomUUID().slice(0, 8)}`,
    })
    .expect(201);
  const workspaceId = (ws.body as { id: string }).id;

  await addMember(app, owner, workspaceId, member);

  const projectName = `Project ${label}`;
  const project = await api(app)
    .post('/api/projects')
    .set(asUser(owner, workspaceId))
    .send({ name: projectName, memberIds: [member.id] })
    .expect(201);
  const projectId = (project.body as { id: string }).id;

  const taskTitle = `Task ${label}`;
  const task = await api(app)
    .post('/api/tasks')
    .set(asUser(owner, workspaceId))
    .send({ projectId, title: taskTitle, assigneeId: member.id })
    .expect(201);
  const taskId = (task.body as { id: string }).id;

  const notifications = await api(app)
    .get('/api/notifications')
    .set(asUser(member, workspaceId))
    .expect(200);
  const notificationId = (
    notifications.body as { notifications: Array<{ id: string }> }
  ).notifications[0].id;

  const pending = await api(app)
    .post('/api/invitations')
    .set(asUser(owner, workspaceId))
    .send({ email: `pending-${randomUUID()}@e2e.test`, role: 'member' })
    .expect(201);
  const pendingInvitationId = (pending.body as { id: string }).id;

  const key = await api(app)
    .post('/api/api-keys')
    .set(asUser(owner, workspaceId))
    .send({
      name: `Key ${label}`,
      scopes: [
        'projects:read',
        'projects:write',
        'tasks:read',
        'tasks:write',
        'members:read',
        'usage:read',
        'audit:read',
      ].map((scope) => ({ scope })),
    })
    .expect(201);
  const apiKey = key.body as { id: string; key: string };

  return {
    label,
    workspaceId,
    workspaceName,
    owner,
    member,
    projectId,
    projectName,
    taskId,
    taskTitle,
    notificationId,
    pendingInvitationId,
    apiKey: { id: apiKey.id, key: apiKey.key },
  };
}

/** Every identifier and label that must never appear in another tenant's responses. */
export const secretsOf = (t: TenantFixture): string[] => [
  t.workspaceId,
  t.workspaceName,
  t.projectId,
  t.projectName,
  t.taskId,
  t.taskTitle,
  t.notificationId,
  t.pendingInvitationId,
  t.apiKey.id,
  t.owner.email,
  t.member.email,
];
