import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLICKHOUSE, PRISMA, runQuery } from './db';

describe('runQuery', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses ClickHouse when configured and healthy', async () => {
    vi.stubEnv('CLICKHOUSE_URL', 'http://clickhouse:8123/talivia');

    const clickhouse = vi.fn().mockResolvedValue('clickhouse-result');
    const prisma = vi.fn().mockResolvedValue('prisma-result');

    await expect(runQuery({ [CLICKHOUSE]: clickhouse, [PRISMA]: prisma })).resolves.toBe(
      'clickhouse-result',
    );
    expect(clickhouse).toHaveBeenCalledOnce();
    expect(prisma).not.toHaveBeenCalled();
  });

  it('falls back to PostgreSQL when ClickHouse fails', async () => {
    vi.stubEnv('CLICKHOUSE_URL', 'http://clickhouse:8123/talivia');

    const clickhouse = vi.fn().mockRejectedValue(new Error('MEMORY_LIMIT_EXCEEDED'));
    const prisma = vi.fn().mockResolvedValue('prisma-result');

    await expect(runQuery({ [CLICKHOUSE]: clickhouse, [PRISMA]: prisma })).resolves.toBe(
      'prisma-result',
    );
    expect(prisma).toHaveBeenCalledOnce();
  });

  it('rethrows when ClickHouse fails and no PostgreSQL implementation exists', async () => {
    vi.stubEnv('CLICKHOUSE_URL', 'http://clickhouse:8123/talivia');

    const clickhouse = vi.fn().mockRejectedValue(new Error('MEMORY_LIMIT_EXCEEDED'));

    await expect(runQuery({ [CLICKHOUSE]: clickhouse })).rejects.toThrow('MEMORY_LIMIT_EXCEEDED');
  });

  it('uses PostgreSQL when ClickHouse is not configured', async () => {
    vi.stubEnv('CLICKHOUSE_URL', '');

    const clickhouse = vi.fn();
    const prisma = vi.fn().mockResolvedValue('prisma-result');

    await expect(runQuery({ [CLICKHOUSE]: clickhouse, [PRISMA]: prisma })).resolves.toBe(
      'prisma-result',
    );
    expect(clickhouse).not.toHaveBeenCalled();
  });
});
