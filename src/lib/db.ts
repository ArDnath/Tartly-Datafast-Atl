import { logger } from './logger';

export const PRISMA = 'prisma';
export const POSTGRESQL = 'postgresql';
export const CLICKHOUSE = 'clickhouse';
export const KAFKA = 'kafka';
export const KAFKA_PRODUCER = 'kafka-producer';

// A broken ClickHouse must not make the product look like it lost all traffic.
// PostgreSQL already holds the relational event mirror, so a failed read or
// write can fall back to the same query implementation without crossing a
// tenant boundary. Log at most once a minute per process to avoid a log flood
// while the event store is down.
let lastFallbackLogAt = 0;

// Fixes issue with converting bigint values
BigInt.prototype.toJSON = function () {
  return Number(this);
};

export function getDatabaseType(url = process.env.DATABASE_URL) {
  const type = url?.split(':')[0];

  if (type === 'postgres') {
    return POSTGRESQL;
  }

  return type;
}

export async function runQuery(queries: any) {
  if (process.env.CLICKHOUSE_URL) {
    if (queries[KAFKA]) {
      return queries[KAFKA]();
    }

    try {
      return await queries[CLICKHOUSE]();
    } catch (error) {
      if (!queries[PRISMA]) {
        throw error;
      }

      const now = Date.now();

      if (now - lastFallbackLogAt > 60_000) {
        lastFallbackLogAt = now;
        logger.warn('analytics.clickhouse_fallback', {
          message: error instanceof Error ? error.message : String(error),
        });
      }

      return queries[PRISMA]();
    }
  }

  const db = getDatabaseType();

  if (db === POSTGRESQL) {
    return queries[PRISMA]();
  }
}

export function notImplemented() {
  throw new Error('Not implemented.');
}
