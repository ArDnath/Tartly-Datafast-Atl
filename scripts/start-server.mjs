#!/usr/bin/env node
/**
 * Graceful-start wrapper for the Next.js standalone server.
 *
 * Docker sends SIGTERM to PID 1. This wrapper forwards it to the generated
 * standalone `server.js`, waits for the listener to drain, and only then exits.
 * A hard timeout prevents a stuck connection from holding the container open
 * forever. Next itself handles in-flight requests; this adds a bounded signal
 * path and a predictable exit code.
 */
import { spawn } from 'node:child_process';

const DRAIN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 30_000);
const child = spawn(process.execPath, ['server.js'], {
  env: process.env,
  stdio: 'inherit',
});

let shuttingDown = false;
let forceTimer;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
    forceTimer = setTimeout(() => {
      child.kill('SIGKILL');
    }, DRAIN_TIMEOUT_MS);
    forceTimer.unref?.();
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

child.on('exit', (code, signal) => {
  if (forceTimer) {
    clearTimeout(forceTimer);
  }

  if (signal && code === null) {
    process.exit(0);
  }

  process.exit(code ?? 0);
});

child.on('error', error => {
  process.stderr.write(
    `${JSON.stringify({ level: 'error', event: 'server.spawn_failed', message: error.message })}\n`,
  );
  process.exit(1);
});
