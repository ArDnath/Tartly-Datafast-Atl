import assert from 'node:assert/strict';
import { test } from 'node:test';
import { splitStatements } from './lib/split-sql-statements.mjs';

test('ignores semicolons inside line comments', () => {
  const sql = `-- Plan-specific retention is enforced by the job; this TTL is a net.
ALTER TABLE website_event MODIFY TTL created_at + INTERVAL 365 DAY;
-- trailing comment; with a semicolon
`;

  assert.deepEqual(splitStatements(sql), [
    'ALTER TABLE website_event MODIFY TTL created_at + INTERVAL 365 DAY',
  ]);
});

test('ignores block comments and keeps quoted semicolons', () => {
  const sql = `/* a; comment */
SELECT 'a;b' AS value;
INSERT INTO t VALUES ('x;y');
`;

  assert.deepEqual(splitStatements(sql), ["SELECT 'a;b' AS value", "INSERT INTO t VALUES ('x;y')"]);
});

test('drops empty statements and trailing comments', () => {
  assert.deepEqual(splitStatements(';;\n-- only a comment;\n'), []);
});

test('the retention migration produces six executable statements', async () => {
  const { readFile } = await import('node:fs/promises');
  const sql = await readFile('db/clickhouse/migrations/12_payload_ttl.sql', 'utf8');
  const statements = splitStatements(sql);

  assert.equal(statements.length, 6);
  assert.ok(statements.every(statement => statement.startsWith('ALTER TABLE ')));
});
