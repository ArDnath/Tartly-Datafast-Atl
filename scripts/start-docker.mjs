#!/usr/bin/env node
/**
 * Container entrypoint.
 *
 * The production image deliberately does not install a global pnpm: the
 * runtime only needs the application dependencies, and the global pnpm tree
 * pulled extra transitive packages (including a vulnerable `tar`) into the
 * image. Run the preflight checks with the same Node binary, then hand off to
 * the existing graceful-start wrapper.
 */
import { spawnSync } from 'node:child_process';

const CHECKS = ['scripts/check-env.js', 'scripts/check-db.js'];

for (const script of CHECKS) {
  const result = spawnSync(process.execPath, [script], {
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    process.stderr.write(
      `${JSON.stringify({
        level: 'error',
        event: 'startup.check_failed',
        script,
        message: result.error.message,
      })}\n`,
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Register the graceful SIGTERM/SIGINT path on this PID so Docker's stop
// signal reaches the standalone server through the existing wrapper.
await import('./start-server.mjs');
