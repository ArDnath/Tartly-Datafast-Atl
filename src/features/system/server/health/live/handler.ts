export const dynamic = 'force-dynamic';

/**
 * Liveness probe: the process can answer HTTP. It deliberately does not touch
 * the database, so a transient database outage does not restart healthy app
 * containers. Use `/api/health/ready` (or `/api/health`) for dependency checks.
 */
export function GET() {
  return Response.json(
    {
      ok: true,
      service: 'tartly',
      version: process.env.BUILD_VERSION || 'local',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
