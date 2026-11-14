import clickhouse from '@/lib/clickhouse';

/**
 * ClickHouse payload retention and tenant deletion.
 *
 * PostgreSQL is the control plane and keeps the durable billing/audit rows.
 * This helper purges only the analytics payload tables that the dashboard can
 * read when `CLICKHOUSE_URL` is set. Every statement is tenant-scoped by
 * `website_id`; the table names are fixed constants, never request input.
 *
 * Deletion is idempotent: running the same cutoff twice is a no-op. A failed
 * statement rejects so the caller's structured log records it.
 */
const EVENT_TABLES = [
  'website_event',
  'event_data',
  'session_data',
  'website_event_stats_hourly',
  'website_revenue',
] as const;

const REPLAY_TABLE = 'session_replay';

async function deleteRows(
  client: NonNullable<Awaited<ReturnType<typeof clickhouse.connect>>>,
  table: string,
  websiteId: string,
  cutoff: Date | null,
) {
  const cutoffClause = cutoff ? 'AND created_at < {cutoff:DateTime}' : '';

  await client.command({
    query: `DELETE FROM talivia.${table} WHERE website_id = {websiteId:UUID} ${cutoffClause}`,
    query_params: {
      websiteId,
      ...(cutoff ? { cutoff: clickhouse.getUTCString(cutoff) } : {}),
    },
  });
}

export async function deleteClickHousePayloads({
  websiteId,
  eventCutoff,
  replayCutoff,
}: {
  websiteId: string;
  eventCutoff: Date;
  replayCutoff: Date | null;
}) {
  if (!clickhouse.enabled) {
    return { enabled: false, tables: 0 };
  }

  const client = await clickhouse.connect();

  if (!client) {
    return { enabled: false, tables: 0 };
  }

  for (const table of EVENT_TABLES) {
    await deleteRows(client, table, websiteId, eventCutoff);
  }

  // A null replay cutoff means the plan has no replay entitlement (or the
  // tenant is closed): remove every replay chunk for this website.
  await deleteRows(client, REPLAY_TABLE, websiteId, replayCutoff);

  return { enabled: true, tables: EVENT_TABLES.length + 1 };
}

export async function deleteClickHouseWebsiteData(websiteId: string) {
  if (!clickhouse.enabled) {
    return { enabled: false, tables: 0 };
  }

  const client = await clickhouse.connect();

  if (!client) {
    return { enabled: false, tables: 0 };
  }

  for (const table of EVENT_TABLES) {
    await deleteRows(client, table, websiteId, null);
  }

  await deleteRows(client, REPLAY_TABLE, websiteId, null);

  return { enabled: true, tables: EVENT_TABLES.length + 1 };
}
