import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Upper bound for each dependency check, so a hung dependency cannot hang /health. */
const CHECK_TIMEOUT_MS = 3000;

export interface DependencyCheck {
  status: 'up' | 'down';
  latencyMs: number;
}

export interface HealthReport {
  status: 'ok' | 'unavailable';
  timestamp: string;
  checks: {
    database: DependencyCheck;
    redis: DependencyCheck;
  };
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(`${label} check timed out after ${CHECK_TIMEOUT_MS}ms`),
        ),
      CHECK_TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Up only if the database answers a real query through the application's pool. */
  async checkDatabase(): Promise<DependencyCheck> {
    const start = Date.now();
    try {
      const connected = await withTimeout(
        this.prismaService.checkConnection(),
        'Database',
      );
      return {
        status: connected ? 'up' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  /**
   * Up only if Redis answers PING with PONG. A short-lived connection per check
   * keeps concurrent health requests independent of each other.
   */
  async checkRedis(): Promise<DependencyCheck> {
    const start = Date.now();
    const redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
      port: this.configService.get<number>('REDIS_PORT') ?? 6379,
      lazyConnect: true,
      connectTimeout: CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    // Connection errors are reported through the rejected promises below.
    redis.on('error', () => undefined);

    try {
      // ioredis types the reply as 'PONG'; widen it so the check below is real.
      const reply: string = await withTimeout<string>(
        redis.connect().then(() => redis.ping()),
        'Redis',
      );
      if (reply !== 'PONG') {
        throw new Error(`Unexpected Redis PING reply: ${reply}`);
      }
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'down', latencyMs: Date.now() - start };
    } finally {
      redis.disconnect();
    }
  }

  /** Healthy only when every dependency the application needs is up. */
  async getHealth(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const healthy = database.status === 'up' && redis.status === 'up';

    return {
      status: healthy ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }
}
