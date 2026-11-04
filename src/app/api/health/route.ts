import { withDbRetry } from '@/lib/db-retry';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Readiness endpoint.
 *
 * Returns no connection strings, host names, driver versions or stack traces.
 * A failure is deliberately generic so probing this route cannot fingerprint
 * the database or its configuration.
 */
export async function GET() {
  try {
    await withDbRetry(() => prisma.client.$queryRaw`select 1 as ok`, {
      attempts: 2,
      baseDelayMs: 100,
    });

    return Response.json(
      {
        ok: true,
        service: 'revenuelens',
        database: 'up',
        version: process.env.BUILD_VERSION || 'local',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      {
        ok: false,
        service: 'revenuelens',
        database: 'down',
        version: process.env.BUILD_VERSION || 'local',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
