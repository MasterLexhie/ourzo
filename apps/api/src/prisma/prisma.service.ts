import {Injectable, Logger, OnModuleInit, OnModuleDestroy} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {Pool} from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger: Logger = new Logger(PrismaService.name);

  constructor(connectionString: string) {
    // const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    super({adapter});
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      this.logger.error('Error during Prisma disconnect', error);
    } finally {
      try {
        await this.pool.end();
        this.logger.log('Database pool closed');
      } catch (error) {
        this.logger.error('Error closing database pool', error);
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed', error);
      return false;
    }
  }
}
