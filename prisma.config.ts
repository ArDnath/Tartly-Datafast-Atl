import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Runtime queries use `DATABASE_URL`. The CLI and migrations use
 * `DATABASE_URL_UNPOOLED`, which is a separate variable so a deployment may
 * point migrations at a direct host while runtime traffic uses a pooler. The
 * production Docker stack uses the internal PostgreSQL service for both.
 *
 * Local development can keep a single URL: when `DATABASE_URL_UNPOOLED` is not
 * set we fall back to `DATABASE_URL`.
 */
const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL before running Prisma.');
}

export default defineConfig({
  datasource: {
    url: migrationUrl,
  },
});
