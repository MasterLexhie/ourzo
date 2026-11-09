import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveTestDatabaseUrl } from './test-database';

/** Applies all migrations to the isolated test database before any suite runs. */
export default function globalSetup(): void {
  const databaseUrl = resolveTestDatabaseUrl();
  const prismaBin = join(
    __dirname,
    '..',
    '..',
    'node_modules',
    '.bin',
    'prisma',
  );

  execFileSync(prismaBin, ['migrate', 'deploy'], {
    cwd: join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
