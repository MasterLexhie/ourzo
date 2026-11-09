import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  total: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisHost =
      this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') ?? 6379;

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error('Redis connection error', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for rate limiting');
    });

    this.redis.connect().catch((err: Error) => {
      this.logger.error('Failed to connect to Redis', err);
    });
  }

  /**
   * Fixed-window counter in Redis.
   *
   * Redis failure policy: with `failClosed` the request is rejected (503);
   * otherwise it is allowed and the failure is logged.
   */
  async checkLimit(
    identifier: string,
    options: RateLimitOptions,
    failClosed = false,
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${options.keyPrefix}:${identifier}`;
    const windowSec = Math.ceil(options.windowMs / 1000);

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, windowSec);
      }

      const ttl = await this.redis.ttl(key);
      const remaining = Math.max(0, options.maxRequests - current);

      return {
        allowed: current <= options.maxRequests,
        remaining,
        resetInSeconds: ttl > 0 ? ttl : windowSec,
        total: options.maxRequests,
      };
    } catch (error) {
      if (failClosed) {
        this.logger.error(
          `Rate limit check failed for "${options.keyPrefix}", rejecting request (fail closed)`,
          error,
        );
        throw new ServiceUnavailableException(
          'Service temporarily unavailable, please retry shortly',
        );
      }
      this.logger.error(
        `Rate limit check failed for "${options.keyPrefix}", allowing request (fail open)`,
        error,
      );
      return {
        allowed: true,
        remaining: options.maxRequests,
        resetInSeconds: windowSec,
        total: options.maxRequests,
      };
    }
  }

  async resetLimit(identifier: string, keyPrefix: string): Promise<void> {
    const key = `ratelimit:${keyPrefix}:${identifier}`;
    await this.redis.del(key);
  }

  async getCurrentUsage(
    identifier: string,
    keyPrefix: string,
  ): Promise<number> {
    const key = `ratelimit:${keyPrefix}:${identifier}`;
    const current = await this.redis.get(key);
    return current ? parseInt(current, 10) : 0;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
