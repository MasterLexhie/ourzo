import { resolveTestDatabaseUrl } from './test-database';

// Runs in every e2e worker before modules load. Explicit process.env values
// take precedence over apps/api/.env in ConfigModule and Prisma.
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'e2e-access-secret-not-used-outside-tests-0123456789';
process.env.JWT_REFRESH_SECRET =
  'e2e-refresh-secret-not-used-outside-tests-0123456789';
process.env.RATE_LIMIT_AUTH_MAX = '10000';
process.env.RATE_LIMIT_DEFAULT_MAX = '10000';
process.env.RATE_LIMIT_API_KEY_MAX = '10000';
process.env.WEB_APP_URL = 'http://localhost:5173';
process.env.BCRYPT_ROUNDS = '4';
