import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  ApiKeyAuthGuard,
  ApiKeyRequest,
  extractBearerToken,
  isApiKeyToken,
} from './api-key-auth.guard';

/**
 * Accepts either a user JWT or a workspace API key on the same
 * `Authorization: Bearer` header. Tokens starting with `ourzo_` are API keys
 * (ADR-011); everything else is verified as a JWT.
 *
 * Use only on routes that are intentionally reachable with API keys, and pair
 * it with ApiKeyScopesGuard (deny-by-default for keys).
 */
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly apiKeyAuthGuard: ApiKeyAuthGuard,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    if (isApiKeyToken(extractBearerToken(request))) {
      return this.apiKeyAuthGuard.canActivate(context);
    }
    return this.jwtAuthGuard.canActivate(context);
  }
}
