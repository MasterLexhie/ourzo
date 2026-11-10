import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { PrismaService } from '@/prisma/prisma.service';

export type HttpServer = Parameters<typeof request>[0];

/** Boots the real AppModule with the production HTTP pipeline. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({
    logger: process.env.E2E_DEBUG ? ['error', 'warn'] : false,
  });
  configureApp(app);
  await app.init();
  await assertConnectedToTestDatabase(app);
  return app;
}

/**
 * Defence in depth: confirm the running app is really connected to a *_test
 * database before any suite is allowed to truncate tables.
 */
async function assertConnectedToTestDatabase(
  app: INestApplication,
): Promise<void> {
  const rows = await app.get(PrismaService).$queryRaw<
    Array<{ db: string }>
  >`SELECT current_database() AS db`;
  const db = rows[0]?.db ?? '';
  if (!db.endsWith('_test')) {
    await app.close();
    throw new Error(
      `E2E app is connected to "${db}", expected a *_test database`,
    );
  }
}

const TABLES = [
  'refresh_tokens',
  'api_keys',
  'audit_logs',
  'notifications',
  'usage',
  'tasks',
  'project_members',
  'projects',
  'invitations',
  'workspace_members',
  'workspaces',
  'users',
];

/** Wipes all tenant data. Test-only: the database is guaranteed to be *_test. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export const api = (app: INestApplication) =>
  request(app.getHttpServer() as HttpServer);
