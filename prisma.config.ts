import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Runtime queries use `DATABASE_URL` (a Neon pooled host). The CLI and
 * migrations use `DATABASE_URL_UNPOOLED` (a Neon direct host) because
 * migrations need a long-lived session and cannot run through PgBouncer.
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
