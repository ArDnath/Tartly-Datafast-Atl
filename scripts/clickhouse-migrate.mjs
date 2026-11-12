#!/usr/bin/env node
/**
 * Apply the committed ClickHouse schema and migrations.
 *
 * This is a plain Node script so the production image (which intentionally
 * excludes tsx and the rest of the build toolchain) can run it as a one-shot
 * compose service. Local development uses the same script through
 * `pnpm update-db-clickhouse`.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@clickhouse/client';
import 'dotenv/config';

const migrationsDirectory = join(process.cwd(), 'db/clickhouse/migrations');
const schemaPath = join(process.cwd(), 'db/clickhouse/schema.sql');

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;

  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    const next = sql[index + 1];
    current += character;

    if (quote) {
      if (character === '\\') {
        current += next || '';
        index++;
      } else if (character === quote) {
        if (next === quote) {
          current += next;
          index++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
    } else if (character === ';') {
      const statement = current.slice(0, -1).trim();
      if (statement) statements.push(statement);
      current = '';
    }
  }

  if (current.trim()) statements.push(current.trim());

  return statements;
}

async function executeScript(client, sql) {
  for (const query of splitStatements(sql)) {
    await client.command({ query });
  }
}

async function recordMigration(client, name) {
  await client.insert({
    table: 'schema_migration',
    values: [{ name }],
    format: 'JSONEachRow',
  });
}

async function main() {
  const url = process.env.CLICKHOUSE_URL;

  if (!url) {
    console.log('CLICKHOUSE_URL is not set; skipping ClickHouse migrations.');
    return;
  }

  const client = createClient({ url });

  try {
    await client.command({
      query: `CREATE TABLE IF NOT EXISTS schema_migration
        (name String, applied_at DateTime64(3) DEFAULT now64(3))
        ENGINE = ReplacingMergeTree
        ORDER BY name`,
    });

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter(name => name.endsWith('.sql'))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const appliedResult = await client.query({
      query: 'SELECT name FROM schema_migration FINAL',
      format: 'JSONEachRow',
    });
    const appliedRows = await appliedResult.json();
    const applied = new Set(appliedRows.map(row => row.name));

    // Older installations predate the migration ledger. Establish a baseline
    // from the event identity columns without replaying already-applied files.
    if (!applied.size) {
      const columnsResult = await client.query({
        query: `SELECT name FROM system.columns
          WHERE database = currentDatabase() AND table = 'website_event'`,
        format: 'JSONEachRow',
      });
      const columns = new Set((await columnsResult.json()).map(row => row.name));

      if (!columns.size) {
        await executeScript(client, await readFile(schemaPath, 'utf8'));
        for (const name of migrationFiles) await recordMigration(client, name);
        console.log('Initialized the current ClickHouse schema.');
        return;
      }

      const identityV2Applied = columns.has('visitor_id') && !columns.has('visit_id');
      const identityV2Index = migrationFiles.findIndex(name => name.startsWith('11_'));
      const baseline = identityV2Applied
        ? migrationFiles.slice(0, identityV2Index < 0 ? migrationFiles.length : identityV2Index + 1)
        : migrationFiles.slice(0, identityV2Index < 0 ? migrationFiles.length : identityV2Index);

      for (const name of baseline) {
        await recordMigration(client, name);
        applied.add(name);
      }
    }

    for (const name of migrationFiles) {
      if (applied.has(name)) continue;

      console.log(`Applying ClickHouse migration ${name}...`);
      await executeScript(client, await readFile(join(migrationsDirectory, name), 'utf8'));
      await recordMigration(client, name);
    }
  } finally {
    await client.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
