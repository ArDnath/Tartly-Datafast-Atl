#!/usr/bin/env node
/**
 * Kafka -> ClickHouse bridge.
 *
 * The Next.js app publishes analytics messages to Kafka when
 * KAFKA_URL/KAFKA_BROKER are set. This worker is the only consumer: it writes
 * every topic to its ClickHouse table, commits Kafka offsets only after the
 * insert succeeds, and never drops a message because one row is malformed
 * (parse failures are logged and skipped so a poison record cannot block a
 * partition).
 *
 * Delivery is at-least-once. A crash between the ClickHouse insert and the
 * Kafka commit can duplicate a batch. MergeTree does not deduplicate, so the
 * rare duplicate is accepted rather than losing revenue-attribution events.
 *
 * Start with the `streaming` profile, through deploy.sh:
 *   docker compose --env-file .env --profile streaming up -d --no-deps worker
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@clickhouse/client';
import { Kafka, logLevel } from 'kafkajs';

// Keep the heartbeat outside the OS temp directory. The production image
// copies scripts/ with the nextjs user as owner, and the Compose health check
// reads this exact path.
const HEARTBEAT_FILE =
  process.env.WORKER_HEARTBEAT_FILE || join(process.cwd(), 'scripts', '.worker-heartbeat');

const TOPIC_TABLE = {
  event: 'website_event',
  event_data: 'event_data',
  session_data: 'session_data',
  session_replay: 'session_replay',
};

const GROUP_ID = 'tartly-clickhouse-writer';
const MAX_ROWS_PER_INSERT = 1000;

// A ClickHouse outage used to block the partition forever: kafkajs retried the
// same batch, never committed the offset, and every later event waited behind
// it. Retry transient errors with backoff, then park the batch on a
// dead-letter topic and continue. The PostgreSQL mirror still holds the
// authoritative rows, so a repair job can replay a parked batch; silently
// stopping the whole tracking pipeline cannot be repaired.
const MAX_INSERT_ATTEMPTS = 5;
const DEAD_LETTER_TOPIC = 'event_dead_letter';
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 8_000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function log(level, event, fields = {}) {
  process.stdout.write(
    `${JSON.stringify({ at: new Date().toISOString(), level, event, ...fields })}\n`,
  );
}

function parseKafkaOptions() {
  const brokerList = process.env.KAFKA_BROKER?.trim();

  if (!brokerList || !process.env.KAFKA_URL?.trim()) {
    throw new Error('KAFKA_URL and KAFKA_BROKER are required');
  }

  const url = new URL(process.env.KAFKA_URL);
  const username = url.username ? decodeURIComponent(url.username) : '';
  const password = url.password ? decodeURIComponent(url.password) : '';
  const sasl =
    username && password
      ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
          username,
          password,
        }
      : undefined;

  return {
    brokers: brokerList
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
    ...(sasl ? { sasl, ssl: { rejectUnauthorized: false } } : {}),
  };
}

function chunks(rows, size) {
  const result = [];

  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }

  return result;
}

async function main() {
  if (!process.env.CLICKHOUSE_URL) {
    throw new Error('CLICKHOUSE_URL is required');
  }

  const kafkaOptions = parseKafkaOptions();
  const kafka = new Kafka({
    clientId: 'tartly-clickhouse-writer',
    connectionTimeout: 10_000,
    retry: { retries: 8 },
    logLevel: logLevel.ERROR,
    ...kafkaOptions,
  });
  const consumer = kafka.consumer({ groupId: GROUP_ID, sessionTimeout: 30_000 });
  const producer = kafka.producer();
  const clickhouse = createClient({ url: process.env.CLICKHOUSE_URL });

  // Compose health checks read this file. A Kafka consumer can be "running"
  // while its broker connection is broken, so process liveness alone is not
  // enough for the deploy gate.
  const writeHeartbeat = () => {
    try {
      writeFileSync(HEARTBEAT_FILE, new Date().toISOString());
    } catch (error) {
      log('error', 'worker.heartbeat_failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const heartbeatTimer = setInterval(writeHeartbeat, 15_000);
  heartbeatTimer.unref();
  writeHeartbeat();

  const shutdown = async signal => {
    log('info', 'worker.shutdown', { signal });
    clearInterval(heartbeatTimer);
    await consumer.disconnect().catch(() => {});
    await producer.disconnect().catch(() => {});
    await clickhouse.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await consumer.connect();
  log('info', 'worker.connected', { groupId: GROUP_ID });

  await producer.connect();

  // Create the event topics and the dead-letter topic before subscribing. A
  // quiet production install may start the worker before the first event, so
  // relying on producer auto-create would leave the consumer waiting on
  // unknown topics. Listing first avoids Kafkajs logging "Topic creation
  // errors" for every topic that already exists on each worker restart.
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());
    const required = [...Object.keys(TOPIC_TABLE), DEAD_LETTER_TOPIC];
    const missing = required.filter(topic => !existing.has(topic));

    if (missing.length > 0) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: missing.map(topic => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
      });
    }
  } finally {
    await admin.disconnect().catch(() => {});
  }

  for (const topic of Object.keys(TOPIC_TABLE)) {
    await consumer.subscribe({ topic, fromBeginning: true });
  }

  let inserted = 0;

  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
      if (isStale()) return;

      const table = TOPIC_TABLE[batch.topic];

      if (!table) {
        log('warn', 'worker.unknown_topic', { topic: batch.topic });
        return;
      }

      // Keep every message in offset order. Invalid JSON is parked in the
      // same list with a null row, so offsets are still resolved in order
      // after the surrounding chunk is written or dead-lettered.
      const items = [];

      for (const message of batch.messages) {
        if (!isRunning()) return;

        if (!message.value) {
          items.push({ row: null, message });
          continue;
        }

        try {
          items.push({
            row: JSON.parse(message.value.toString('utf8')),
            message,
          });
        } catch (error) {
          log('error', 'worker.invalid_json', {
            topic: batch.topic,
            partition: batch.partition,
            offset: message.offset,
            message: error instanceof Error ? error.message : String(error),
          });
          items.push({ row: null, message });
        }
      }

      for (const chunk of chunks(items, MAX_ROWS_PER_INSERT)) {
        const valid = chunk.filter(item => item.row !== null);
        const rows = valid.map(item => item.row);
        let lastError;

        if (rows.length > 0) {
          for (let attempt = 1; attempt <= MAX_INSERT_ATTEMPTS; attempt += 1) {
            try {
              await clickhouse.insert({ table, values: rows, format: 'JSONEachRow' });
              lastError = undefined;
              break;
            } catch (error) {
              lastError = error;

              if (attempt < MAX_INSERT_ATTEMPTS) {
                const delay = Math.min(
                  RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
                  RETRY_MAX_DELAY_MS,
                );

                log('warn', 'worker.insert_retry', {
                  table,
                  attempt,
                  maxAttempts: MAX_INSERT_ATTEMPTS,
                  delayMs: delay,
                  message: error instanceof Error ? error.message : String(error),
                });
                await sleep(delay);
              }
            }
          }
        }

        if (lastError) {
          const first = valid[0].message;
          const last = valid[valid.length - 1].message;
          const reason = lastError instanceof Error ? lastError.message : String(lastError);

          try {
            await producer.send({
              topic: DEAD_LETTER_TOPIC,
              messages: valid.map(({ message }) => ({
                key: message.key ?? null,
                value: message.value,
                headers: {
                  'x-source-topic': batch.topic,
                  'x-source-partition': String(batch.partition),
                  'x-error': reason.slice(0, 500),
                  'x-attempts': String(MAX_INSERT_ATTEMPTS),
                },
              })),
            });
          } catch (deadLetterError) {
            // Kafka itself is unhealthy. Commit nothing and let kafkajs
            // retry the batch; the PostgreSQL mirror is already durable.
            log('error', 'worker.dead_letter_failed', {
              topic: batch.topic,
              partition: batch.partition,
              offset: first.offset,
              message:
                deadLetterError instanceof Error
                  ? deadLetterError.message
                  : String(deadLetterError),
            });
            throw deadLetterError;
          }

          log('error', 'worker.dead_lettered', {
            topic: batch.topic,
            partition: batch.partition,
            fromOffset: first.offset,
            toOffset: last.offset,
            rows: chunk.length,
            message: reason,
          });
        }

        for (const item of chunk) {
          resolveOffset(item.message.offset);
        }

        if (!lastError) {
          inserted += rows.length;
        }
      }

      await heartbeat();

      if (inserted > 0 && inserted % 10_000 < items.length) {
        log('info', 'worker.progress', { inserted });
      }
    },
  });
}

main().catch(error => {
  log('error', 'worker.fatal', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
