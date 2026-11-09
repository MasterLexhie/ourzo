import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService, API_KEY_PREFIX } from '../api-keys.service';
import { getRequestContext } from '@/common/request-context';

export interface ApiKeyPrincipal {
  apiKeyId: string;
  workspaceId: string;
  scopes: string[];
}

export interface ApiKeyRequest extends Request {
  apiKey?: ApiKeyPrincipal;
}

/** Returns the raw bearer token from the Authorization header, if any. */
export const extractBearerToken = (request: Request): string | null => {
  const header = request.headers.authorization ?? '';
  const [scheme, token, ...rest] = header.split(' ');
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    return null;
  }
  return token;
};

export const isApiKeyToken = (token: string | null): token is string =>
  !!token && token.startsWith(API_KEY_PREFIX);

/**
 * Authenticates `Authorization: Bearer ourzo_<prefix>_<secret>` API keys.
 * Invalid, revoked or expired keys are rejected with 401.
 *
 * On success the request acts as the key's creator (`request.user`) and is
 * pinned to the key's workspace (`request.apiKey`). WorkspaceContextGuard and
 * ApiKeyScopesGuard enforce the workspace binding and scopes downstream.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const token = extractBearerToken(request);

    if (!isApiKeyToken(token)) {
      throw new UnauthorizedException('API key required');
    }

    // Key shape: ourzo_<8 chars>_<32 chars>; lookup is by "ourzo_<8 chars>".
    const parts = token.split('_');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }
    const prefix = `${parts[0]}_${parts[1]}`;

    const validatedKey = await this.apiKeysService.validateKey(prefix, token);

    if (!validatedKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    request.apiKey = {
      apiKeyId: validatedKey.id,
      workspaceId: validatedKey.workspaceId,
      scopes: (validatedKey.scopes as string[]) ?? [],
    };
    // The key acts on behalf of its creator (an Owner when the key was made).
    request.user = { id: validatedKey.createdBy };

    const store = getRequestContext();
    if (store) {
      store.apiKeyId = validatedKey.id;
    }

    return true;
  }
}
