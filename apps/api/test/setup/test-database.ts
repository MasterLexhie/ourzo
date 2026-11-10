/**
 * E2E tests run against a dedicated database supplied via TEST_DATABASE_URL.
 * They must never touch a development or production database, so the URL is
 * required and its database name must end in "_test".
 */
export function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at a disposable database whose name ends in "_test" ' +
        '(e.g. postgresql://user@localhost:5432/ourzo_test).',
    );
  }

  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run e2e tests against database "${databaseName}": the name must end in "_test".`,
    );
  }

  return url;
}
