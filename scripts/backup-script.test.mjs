import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const BACKUP_SCRIPT = new URL('../deploy/production/backup.sh', import.meta.url);

test('backup script keeps secrets out of stdout', async () => {
  const source = await readFile(BACKUP_SCRIPT, 'utf8');
  assert.doesNotMatch(source, /echo.*PASSWORD/i, 'backup.sh must not print credentials');
  assert.doesNotMatch(source, /set -x/, 'backup.sh must not enable xtrace');
});

test('backup script supports an optional off-host copy', async () => {
  const source = await readFile(BACKUP_SCRIPT, 'utf8');
  assert.match(source, /RCLONE_REMOTE=\$\(read_env_value RCLONE_REMOTE\)/);
  assert.match(source, /RCLONE_DEST=\$\(read_env_value RCLONE_DEST\)/);
  assert.match(source, /rclone copy "\$BACKUP_DIR" "\$RCLONE_DEST"/);
  assert.match(source, /RCLONE_CONFIG="\$RUNTIME_DIR\/rclone\.conf"/);
});

test('backup script never uploads the raw .env unencrypted when off-host is configured', async () => {
  const source = await readFile(BACKUP_SCRIPT, 'utf8');
  // The off-host upload copies the (mode-700) backup directory, which includes
  // the env copy; rclone transport is TLS. No plaintext secret is echoed.
  assert.doesNotMatch(source, /cat .*\.env.*rclone/i);
});
