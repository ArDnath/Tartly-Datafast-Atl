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
import { createClient } from '@clickhouse/client';
import { Kafka, logLevel } from 'kafkajs';

const HEARTBEAT_FILE = process.env.WORKER_HEARTBEAT_FILE || '/tmp/tartly-worker-heartbeat';

const TOPIC_TABLE = {
  event: 'website_event',
  event_data: 'event_data',
  session_data: 'session_data',
  session_replay: 'session_replay',
};

const GROUP_ID = 'tartly-clickhouse-writer';
const MAX_ROWS_PER_INSERT = 1000;

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
    await clickhouse.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await consumer.connect();
  log('info', 'worker.connected', { groupId: GROUP_ID });

  // Create the four topics before subscribing. A quiet production install may
  // start the worker before the first event, so relying on producer auto-create
  // would leave the consumer waiting on unknown topics.
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: Object.keys(TOPIC_TABLE).map(topic => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });
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

      const rows = [];
      const pending = [];

      for (const message of batch.messages) {
        if (!isRunning()) return;

        if (!message.value) {
          resolveOffset(message.offset);
          continue;
        }

        try {
          rows.push(JSON.parse(message.value.toString('utf8')));
          pending.push(message);
        } catch (error) {
          log('error', 'worker.invalid_json', {
            topic: batch.topic,
            partition: batch.partition,
            offset: message.offset,
            message: error instanceof Error ? error.message : String(error),
          });
          resolveOffset(message.offset);
        }
      }

      for (const chunk of chunks(rows, MAX_ROWS_PER_INSERT)) {
        await clickhouse.insert({ table, values: chunk, format: 'JSONEachRow' });
      }

      for (const message of pending) {
        resolveOffset(message.offset);
      }

      await heartbeat();

      inserted += rows.length;

      if (inserted > 0 && inserted % 10_000 < rows.length) {
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
