import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { ApiKeyRequest } from './api-key-auth.guard';

/**
 * Scope enforcement for API-key requests. JWT (user) requests are unaffected.
 *
 * Deny-by-default: an API-key request to a route without `@RequireScopes`
 * is rejected, so key access must be opted into per route.
 */
@Injectable()
export class ApiKeyScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const apiKey = request.apiKey;

    if (!apiKey) {
      return true;
    }

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      throw new ForbiddenException(
        'This endpoint is not available to API keys',
      );
    }

    const hasRequiredScopes = requiredScopes.every((scope) =>
      apiKey.scopes.includes(scope),
    );

    if (!hasRequiredScopes) {
      throw new ForbiddenException(
        `Insufficient API key scopes. Required: ${requiredScopes.join(', ')}`,
      );
    }

    return true;
  }
}
