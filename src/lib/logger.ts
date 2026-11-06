/**
 * Structured server logging with conservative redaction.
 *
 * Logs are JSON lines so a host can ingest them without a parsing rule per
 * message. Secrets are dropped before serialization: provider keys, session
 * tokens, passwords, cookies, and authorization headers must never appear in
 * logs, even when an object is logged by accident.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACTED = '[redacted]';

const SECRET_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|cookie|api[-_]?key|credential|webhook[-_]?secret)/i;

export interface LogFields {
  [key: string]: unknown;
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return '[truncated]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map(item => redactValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactValue(item, depth + 1);
    }

    return output;
  }

  if (typeof value === 'string' && value.length > 2_000) {
    return `${value.slice(0, 2_000)}…`;
  }

  return value;
}

export function redactLogFields(fields: LogFields): LogFields {
  return redactValue(fields) as LogFields;
}

export function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 12).join('\n'),
  };
}

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = {
    at: new Date().toISOString(),
    level,
    event,
    ...redactLogFields(fields),
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  debug: (event: string, fields?: LogFields) => write('debug', event, fields),
  info: (event: string, fields?: LogFields) => write('info', event, fields),
  warn: (event: string, fields?: LogFields) => write('warn', event, fields),
  error: (event: string, fields?: LogFields) => write('error', event, fields),
};

/**
 * Optional error-tracking hook. Set ERROR_TRACKING_WEBHOOK to a collector that
 * accepts a JSON POST. Failure to report is swallowed so observability can
 * never take down a request.
 */
export async function captureException(error: unknown, context: LogFields = {}): Promise<void> {
  logger.error(context.event ? String(context.event) : 'unhandled-error', {
    ...context,
    error: serializeError(error),
  });

  const endpoint = process.env.ERROR_TRACKING_WEBHOOK?.trim();

  if (!endpoint) {
    return;
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service: 'tartly',
        at: new Date().toISOString(),
        context: redactLogFields(context),
        error: serializeError(error),
      }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // The local log entry above is the fallback.
  }
}
