import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MembersRepository } from '@/members/repositories/members.repository';
import { ApiKeysRepository } from './repositories/api-keys.repository';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import {
  ApiKeyResponseDto,
  ApiKeyListResponseDto,
  CreateApiKeyResponseDto,
} from './dto/api-key-response.dto';
import { WorkspaceRole, ApiKey } from '@prisma/client';
import { hash, verify } from '@node-rs/bcrypt';
import { randomBytes } from 'crypto';
import { UsageService } from '@/usage/usage.service';
import { AuditService } from '@/audit/audit.service';

export const API_KEY_PREFIX = 'ourzo_';

export const VALID_SCOPES = [
  'projects:read',
  'projects:write',
  'tasks:read',
  'tasks:write',
  'members:read',
  'usage:read',
  'audit:read',
] as const;

type ValidScope = (typeof VALID_SCOPES)[number];

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly usageService: UsageService,
    private readonly auditService: AuditService,
  ) {}

  private async generateKey(): Promise<{
    prefix: string;
    key: string;
    hash: string;
  }> {
    const prefix = `${API_KEY_PREFIX}${this.randomString(8)}`;
    const randomPart = this.randomString(32);
    const fullKey = `${prefix}_${randomPart}`;
    const keyHash = await hash(fullKey, 12);
    return { prefix, key: fullKey, hash: keyHash };
  }

  /**
   * Cryptographically secure random string over [a-z0-9].
   * Uses rejection sampling so every character is uniformly distributed.
   */
  private randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    // Largest multiple of chars.length that fits in a byte (252 for 36 chars).
    const maxUnbiased = 256 - (256 % chars.length);
    let result = '';
    while (result.length < length) {
      for (const byte of randomBytes(length * 2)) {
        if (byte < maxUnbiased) {
          result += chars[byte % chars.length];
          if (result.length === length) break;
        }
      }
    }
    return result;
  }

  private validateScopes(scopes: string[]): ValidScope[] {
    const invalidScopes = scopes.filter(
      (s) => !VALID_SCOPES.includes(s as ValidScope),
    );
    if (invalidScopes.length > 0) {
      throw new ForbiddenException(
        `Invalid scopes: ${invalidScopes.join(', ')}`,
      );
    }
    return scopes as ValidScope[];
  }

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.role !== WorkspaceRole.owner) {
      throw new ForbiddenException('Only owners can create API keys');
    }

    await this.usageService.assertWithinLimit(workspaceId, 'api_keys');

    const scopes = this.validateScopes(dto.scopes.map((s) => s.scope));
    const { prefix, key, hash: keyHash } = await this.generateKey();

    const apiKey = await this.apiKeysRepository.create({
      workspaceId,
      createdBy: userId,
      name: dto.name,
      keyPrefix: prefix,
      keyHash,
      scopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.auditService.record({
      workspaceId,
      actorId: userId,
      action: 'api_key.created',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      metadata: { name: dto.name, scopes },
    });

    this.logger.log(
      `API key created: ${apiKey.id} in workspace ${workspaceId} by ${userId}`,
    );

    return {
      id: apiKey.id,
      key,
      name: apiKey.name,
      scopes: scopes.map((s) => ({ scope: s })),
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(
    workspaceId: string,
    includeRevoked = false,
  ): Promise<ApiKeyListResponseDto> {
    const apiKeys = includeRevoked
      ? await this.apiKeysRepository.findAllWithRevoked(workspaceId)
      : await this.apiKeysRepository.findByWorkspace(workspaceId);

    return {
      apiKeys: apiKeys.map((k) => this.mapToResponse(k)),
    };
  }

  async findOne(
    userId: string,
    workspaceId: string,
    keyId: string,
  ): Promise<ApiKeyResponseDto> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.role !== WorkspaceRole.owner) {
      throw new ForbiddenException('Only owners can view API keys');
    }

    const apiKey = await this.apiKeysRepository.findById(keyId, workspaceId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return this.mapToResponse(apiKey);
  }

  async revoke(
    userId: string,
    workspaceId: string,
    keyId: string,
  ): Promise<{ message: string }> {
    const membership = await this.membersRepository.findMembership(
      workspaceId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    if (membership.role !== WorkspaceRole.owner) {
      throw new ForbiddenException('Only owners can revoke API keys');
    }

    const apiKey = await this.apiKeysRepository.findById(keyId, workspaceId);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.revokedAt) {
      throw new ForbiddenException('API key is already revoked');
    }

    const revoked = await this.apiKeysRepository.revoke(keyId, workspaceId);
    if (!revoked) {
      throw new ForbiddenException('API key is already revoked');
    }

    await this.auditService.record({
      workspaceId,
      actorId: userId,
      action: 'api_key.revoked',
      resourceType: 'api_key',
      resourceId: keyId,
      metadata: { name: apiKey.name },
    });

    this.logger.log(
      `API key revoked: ${keyId} in workspace ${workspaceId} by ${userId}`,
    );

    return { message: 'API key revoked successfully' };
  }

  async validateKey(
    keyPrefix: string,
    providedKey: string,
  ): Promise<ApiKey | null> {
    const apiKey = await this.apiKeysRepository.findByPrefix(keyPrefix);

    if (!apiKey) {
      return null;
    }

    if (apiKey.revokedAt) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    const isValid = await verify(providedKey, apiKey.keyHash);
    if (!isValid) {
      return null;
    }

    await this.apiKeysRepository.updateLastUsed(apiKey.id);

    return apiKey;
  }

  private mapToResponse(apiKey: ApiKey): ApiKeyResponseDto {
    const scopes = (apiKey.scopes as string[]) ?? [];
    return {
      id: apiKey.id,
      workspaceId: apiKey.workspaceId,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: scopes.map((s) => ({ scope: s })),
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      revokedAt: apiKey.revokedAt,
      createdAt: apiKey.createdAt,
    };
  }
}
