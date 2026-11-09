import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const redisHost =
      this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') ?? 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      lazyConnect: true,
      connectTimeout: 2000,
    });
  }

  async checkDatabase(): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
    const start = Date.now();
    try {
      const connected = await this.prismaService.checkConnection();
      const latencyMs = Date.now() - start;
      return { status: connected ? 'up' : 'down', latencyMs };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  async checkRedis(): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.redis.connect();
      await this.redis.ping();
      await this.redis.quit();
      const latencyMs = Date.now() - start;
      return { status: 'up', latencyMs };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  async getHealth() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allUp = database.status === 'up' && redis.status === 'up';

    return {
      status: allUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
    };
  }
}
