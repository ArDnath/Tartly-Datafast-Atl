import debug from 'debug';
import { hash } from '@/lib/crypto';
import prisma from '@/lib/prisma';

const log = debug('tartly:rate-limit');

/**
 * Fixed-window rate limiting backed by PostgreSQL.
 *
 * A single atomic INSERT … ON CONFLICT statement keeps the counter correct
 * across concurrent requests and across server instances, which an in-memory
 * map cannot do on a serverless host. Redis (when configured) is used by the
 * event collector, but authentication limits deliberately do not depend on it
 * so a missing Redis deployment cannot disable brute-force protection.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function consumeRateLimit({
  key,
  limit,
  windowSeconds,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  try {
    const rows = await prisma.client.$queryRaw<Array<{ count: number; expires_at: Date }>>`
      INSERT INTO rate_limit_bucket (key, window_start, count, expires_at)
      VALUES (${key}, now(), 1, now() + make_interval(secs => ${windowSeconds}::double precision))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_bucket.window_start <= now() - make_interval(secs => ${windowSeconds}::double precision)
          THEN 1
          ELSE rate_limit_bucket.count + 1
        END,
        window_start = CASE
          WHEN rate_limit_bucket.window_start <= now() - make_interval(secs => ${windowSeconds}::double precision)
          THEN now()
          ELSE rate_limit_bucket.window_start
        END,
        expires_at = CASE
          WHEN rate_limit_bucket.window_start <= now() - make_interval(secs => ${windowSeconds}::double precision)
          THEN now() + make_interval(secs => ${windowSeconds}::double precision)
          ELSE rate_limit_bucket.expires_at
        END
      RETURNING count, expires_at
    `;

    const row = rows[0];
    const count = Number(row?.count ?? 1);
    const retryAfterSeconds = row?.expires_at
      ? Math.max(1, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1000))
      : windowSeconds;

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds,
    };
  } catch (cause) {
    // Authentication itself needs the database, so a rate-limit failure must
    // not take the whole login path down. Log without credentials.
    log('Rate limit check failed: %o', cause);

    return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
  }
}

export function rateLimitKey(scope: string, ...parts: Array<string | null | undefined>) {
  return [scope, ...parts.filter(Boolean)].join(':').slice(0, 255);
}

export function hashRateLimitSubject(value: string) {
  return hash(value).slice(0, 32);
}
