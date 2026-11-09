import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RateLimitService, RateLimitOptions } from './rate-limit.service';
import {
  RATE_LIMIT_KEY,
  RateLimitMetadata,
  RateLimitPolicy,
} from './decorators/rate-limit.decorator';

interface RateLimitRequest extends Request {
  rateLimit?: {
    remaining: number;
    resetInSeconds: number;
    limited: boolean;
  };
  apiKey?: {
    apiKeyId: string;
    workspaceId: string;
    scopes: string[];
  };
  user?: { id: string };
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMITS: Record<RateLimitPolicy, number> = {
  auth: 10,
  user: 300,
  'api-key': 120,
};

/**
 * Applies the `@RateLimit(policy)` metadata. Must run AFTER the
 * authentication guard so per-user / per-key identifiers resolve; it is a
 * no-op on routes without the metadata.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RateLimitMetadata>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RateLimitRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // A key-authenticated request is always limited per key, never per user.
    const policy: RateLimitPolicy =
      metadata.policy !== 'auth' && request.apiKey
        ? 'api-key'
        : metadata.policy;
    const options = this.resolveOptions(policy);
    const identifier = this.getIdentifier(request, policy);

    const result = await this.rateLimitService.checkLimit(
      identifier,
      options,
      policy === 'auth',
    );

    request.rateLimit = {
      remaining: result.remaining,
      resetInSeconds: result.resetInSeconds,
      limited: !result.allowed,
    };
    response.setHeader('X-RateLimit-Limit', String(result.total));
    response.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.resetInSeconds));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please retry later',
          retryAfter: result.resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveOptions(policy: RateLimitPolicy): RateLimitOptions {
    const envMax: Record<RateLimitPolicy, string> = {
      auth: 'RATE_LIMIT_AUTH_MAX',
      user: 'RATE_LIMIT_DEFAULT_MAX',
      'api-key': 'RATE_LIMIT_API_KEY_MAX',
    };
    const envWindow =
      policy === 'auth' ? 'RATE_LIMIT_AUTH_WINDOW_MS' : 'RATE_LIMIT_WINDOW_MS';

    return {
      keyPrefix: policy,
      maxRequests: this.readPositiveInt(envMax[policy], DEFAULT_LIMITS[policy]),
      windowMs: this.readPositiveInt(envWindow, DEFAULT_WINDOW_MS),
    };
  }

  private readPositiveInt(name: string, fallback: number): number {
    const value = Number(this.configService.get<string>(name));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private getIdentifier(
    request: RateLimitRequest,
    policy: RateLimitPolicy,
  ): string {
    if (policy === 'api-key' && request.apiKey) {
      return `apikey:${request.apiKey.apiKeyId}`;
    }

    if (policy !== 'auth' && request.user) {
      return `user:${request.user.id}`;
    }

    const ip: string = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    return `ip:${ip}`;
  }
}
