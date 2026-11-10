import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { verify } from '@node-rs/bcrypt';
import { WorkspaceRole } from '@prisma/client';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysRepository } from './repositories/api-keys.repository';
import { MembersRepository } from '@/members/repositories/members.repository';
import { UsageService } from '@/usage/usage.service';
import { AuditService } from '@/audit/audit.service';

jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');
  return { ...actual, randomBytes: jest.fn(actual.randomBytes) };
});

describe('ApiKeysService', () => {
  const members = { findMembership: jest.fn() };
  const keys = { create: jest.fn(), findById: jest.fn(), revoke: jest.fn() };
  const usage = { assertWithinLimit: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new ApiKeysService(
    members as unknown as MembersRepository,
    keys as unknown as ApiKeysRepository,
    usage as unknown as UsageService,
    audit as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    members.findMembership.mockResolvedValue({ role: WorkspaceRole.owner });
    keys.create.mockImplementation((data: object) =>
      Promise.resolve({
        id: 'k1',
        createdAt: new Date(),
        expiresAt: null,
        ...data,
      }),
    );
  });

  it('generates keys from crypto.randomBytes and stores only a bcrypt hash', async () => {
    const res = await service.create('u1', 'ws', {
      name: 'ci',
      scopes: [{ scope: 'projects:read' }],
    });

    expect(crypto.randomBytes).toHaveBeenCalled();
    expect(res.key).toMatch(/^ourzo_[a-z0-9]{8}_[a-z0-9]{32}$/);

    const [[stored]] = keys.create.mock.calls as unknown as Array<
      [{ keyHash: string; keyPrefix: string }]
    >;
    expect(JSON.stringify(stored)).not.toContain(res.key);
    expect(stored.keyPrefix).toBe(res.key.slice(0, 14));
    await expect(verify(res.key, stored.keyHash)).resolves.toBe(true);
  });

  it('rejects unknown scopes', async () => {
    await expect(
      service.create('u1', 'ws', {
        name: 'x',
        scopes: [{ scope: 'admin:everything' }],
      }),
    ).rejects.toThrow('Invalid scopes: admin:everything');
    expect(keys.create).not.toHaveBeenCalled();
  });

  it('only owners manage keys', async () => {
    members.findMembership.mockResolvedValue({ role: WorkspaceRole.admin });
    await expect(
      service.create('u1', 'ws', {
        name: 'x',
        scopes: [{ scope: 'projects:read' }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revocation is workspace-scoped and audited', async () => {
    keys.findById.mockResolvedValue({ id: 'k1', name: 'ci', revokedAt: null });
    keys.revoke.mockResolvedValue(true);
    await service.revoke('u1', 'ws', 'k1');
    expect(keys.findById).toHaveBeenCalledWith('k1', 'ws');
    expect(keys.revoke).toHaveBeenCalledWith('k1', 'ws');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'api_key.revoked' }),
    );
  });

  it('keys from another workspace look missing (404)', async () => {
    keys.findById.mockResolvedValue(null);
    await expect(service.revoke('u1', 'ws', 'k-foreign')).rejects.toThrow(
      'API key not found',
    );
  });
});
