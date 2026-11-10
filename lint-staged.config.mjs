// Pre-commit checks (run by .husky/pre-commit). Each package lints with its
// own tooling from its own directory; files are passed as absolute paths.
const quote = (files) => files.map((f) => `"${f}"`).join(' ');

export default {
  'apps/api/**/*.ts': (files) => [
    `pnpm --filter ourzo-api exec eslint --max-warnings=0 ${quote(files)}`,
    `pnpm --filter ourzo-api exec prettier --check ${quote(files)}`,
  ],
  'apps/web/**/*.{ts,tsx}': (files) => [
    `pnpm --filter web exec oxlint ${quote(files)}`,
  ],
};
