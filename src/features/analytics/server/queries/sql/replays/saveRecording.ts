import { gzipSync } from 'node:zlib';

const MAX_REPLAY_CHUNKS_PER_SESSION = 500;
const MAX_REPLAY_SERIALIZED_BYTES = 10 * 1024 * 1024;
import clickhouse from '@/lib/clickhouse';
import { uuid } from '@/lib/crypto';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import kafka from '@/lib/kafka';
import prisma from '@/lib/prisma';

export interface SaveRecordingArgs {
  websiteId: string;
  sessionId: string;
  chunkIndex: number;
  events: any[];
  eventCount: number;
  startedAt: Date;
  endedAt: Date;
}

export async function countReplayChunks(websiteId: string, sessionId: string) {
  return runQuery({
    [PRISMA]: async () =>
      prisma.client.sessionReplay.count({
        where: { websiteId, sessionId },
      }),
    [CLICKHOUSE]: async () => {
      const rows = await clickhouse.rawQuery<Array<{ count: number }>>(
        `select count() as count from session_replay where website_id = {{websiteId::uuid}} and session_id = {{sessionId::uuid}}`,
        { websiteId, sessionId },
      );

      return Number(rows[0]?.count ?? 0);
    },
  }) as Promise<number>;
}

export async function saveRecording(args: SaveRecordingArgs) {
  return runQuery({
    [PRISMA]: () => relationalQuery(args),
    [CLICKHOUSE]: () => clickhouseQuery(args),
  });
}

async function relationalQuery({
  websiteId,
  sessionId,
  chunkIndex,
  events,
  eventCount,
  startedAt,
  endedAt,
}: SaveRecordingArgs) {
  const serialized = JSON.stringify(events);

  if (Buffer.byteLength(serialized, 'utf-8') > MAX_REPLAY_SERIALIZED_BYTES) {
    throw new Error('replay_chunk_too_large');
  }

  const existingChunks = await prisma.client.sessionReplay.count({
    where: { websiteId, sessionId },
  });

  if (existingChunks >= MAX_REPLAY_CHUNKS_PER_SESSION) {
    throw new Error('replay_chunk_limit');
  }

  const compressed = gzipSync(Buffer.from(serialized, 'utf-8'));

  return prisma.client.sessionReplay.upsert({
    where: {
      sessionId_chunkIndex: {
        sessionId,
        chunkIndex,
      },
    },
    create: {
      id: uuid(),
      websiteId,
      sessionId,
      chunkIndex,
      events: compressed as any,
      eventCount,
      startedAt,
      endedAt,
    },
    update: {
      events: compressed as any,
      eventCount,
      startedAt,
      endedAt,
    },
  });
}

async function clickhouseQuery({
  websiteId,
  sessionId,
  chunkIndex,
  events,
  eventCount,
  startedAt,
  endedAt,
}: SaveRecordingArgs) {
  const { insert, getUTCString } = clickhouse;

  if (Buffer.byteLength(JSON.stringify(events), 'utf-8') > MAX_REPLAY_SERIALIZED_BYTES) {
    throw new Error('replay_chunk_too_large');
  }

  const chunks = await countReplayChunks(websiteId, sessionId);

  if (chunks >= MAX_REPLAY_CHUNKS_PER_SESSION) {
    throw new Error('replay_chunk_limit');
  }
  const { sendMessage } = kafka;

  const message = {
    replay_id: uuid(),
    website_id: websiteId,
    session_id: sessionId,
    chunk_index: chunkIndex,
    events: JSON.stringify(events),
    event_count: eventCount,
    started_at: getUTCString(startedAt),
    ended_at: getUTCString(endedAt),
  };

  if (kafka.enabled) {
    const sent = await sendMessage('session_replay', message);

    if (sent) return sent;
  }

  return insert('session_replay', [message]);
}
