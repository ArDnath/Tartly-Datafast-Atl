/**
 * Retry only *idempotent* database work.
 *
 * Neon can suspend a compute node and wake it on the next connection. Prisma
 * surfaces that as a connection error (`P1001`, `P1002`, `P1017`, `P2024` or a
 * socket reset). Retrying a read is safe; retrying a write can duplicate a
 * row when the first attempt actually committed before the connection died.
 *
 * Call sites must therefore wrap reads (find/count/raw SELECT/health checks),
 * never inserts, updates, deletes or transactions with side effects.
 */

const TRANSIENT_CODES = new Set([
  'P1001', // Can't reach the database server
  'P1002', // Database server timeout
  'P1008', // Operation timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a connection from the pool
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  '08000',
  '08001',
  '08003',
  '08006',
  '57P01',
  '57P02',
  '57P03',
]);

const TRANSIENT_MESSAGE =
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|connection terminated|server has closed the connection|can't reach database server|timed out fetching a new connection/i;

export function isTransientDbError(error: unknown) {
  const code = (error as { code?: unknown; errorCode?: unknown })?.code;
  const errorCode = (error as { code?: unknown; errorCode?: unknown })?.errorCode;

  if (typeof code === 'string' && TRANSIENT_CODES.has(code)) {
    return true;
  }

  if (typeof errorCode === 'string' && TRANSIENT_CODES.has(errorCode)) {
    return true;
  }

  return TRANSIENT_MESSAGE.test(String((error as { message?: unknown })?.message ?? error ?? ''));
}

export interface DbRetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { attempts = 3, baseDelayMs = 150, maxDelayMs = 2_000 }: DbRetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !isTransientDbError(error)) {
        throw error;
      }

      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
