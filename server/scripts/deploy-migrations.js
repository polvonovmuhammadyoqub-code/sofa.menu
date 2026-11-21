import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
const cli = require.resolve('prisma/build/index.js');
const schema = 'server/prisma/schema.postgresql.prisma';
const baseline = '20260601000000_baseline';

function prisma(...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status;
}

const db = new PrismaClient();
let existing;
try {
  [existing] = await db.$queryRaw`
    SELECT
      to_regclass(format('%I.%I', current_schema(), '_prisma_migrations')) IS NOT NULL AS has_history,
      EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = current_schema()
      ) AS has_tables
  `;
} finally {
  await db.$disconnect();
}

if (existing.has_tables && !existing.has_history) {
  // SOFA's original Render deployment used db push. Adopt its baseline only after an exact schema comparison.
  const matches = prisma('migrate', 'diff', '--from-schema-datasource', schema,
    '--to-schema-datamodel', `server/prisma/migrations/${baseline}/schema.prisma`, '--exit-code');
  if (matches !== 0) throw new Error('Existing database does not match the SOFA baseline. Review the schema before baselining.');
  if (prisma('migrate', 'resolve', '--applied', baseline, '--schema', schema) !== 0) {
    throw new Error('SOFA migration baseline could not be recorded.');
  }
}

if (prisma('migrate', 'deploy', '--schema', schema) !== 0) {
  throw new Error('SOFA migrations failed.');
}
