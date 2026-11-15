/**
 * Split a ClickHouse SQL script into executable statements.
 *
 * A naive `split(';')` breaks on semicolons inside `--` comments. The
 * 12_payload_ttl migration contains exactly that: a prose comment with
 * "job; this TTL only..." caused the migration runner to send an empty/comment
 * statement and fail the production deploy. This splitter ignores line and
 * block comments, preserves quoted strings, and drops empty statements.
 */
export function splitStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        current += character;
      }
      continue;
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index++;
      }
      continue;
    }

    if (quote) {
      current += character;

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

    if (character === '-' && next === '-') {
      lineComment = true;
      index++;
      continue;
    }

    if (character === '/' && next === '*') {
      blockComment = true;
      index++;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      current += character;
      continue;
    }

    if (character === ';') {
      const statement = current.trim();

      if (statement) {
        statements.push(statement);
      }

      current = '';
      continue;
    }

    current += character;
  }

  const statement = current.trim();

  if (statement) {
    statements.push(statement);
  }

  return statements;
}
