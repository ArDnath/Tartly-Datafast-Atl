#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Re-encrypt every stored analytics-provider secret with the current
 * APP_SECRET while APP_SECRET_PREVIOUS still holds the old key.
 *
 * Usage:
 *   1. generate a new key: openssl rand -hex 32
 *   2. set APP_SECRET=<new> and APP_SECRET_PREVIOUS=<old>
 *   3. deploy/restart, then run: pnpm rotate:provider-secrets
 *   4. verify the affected websites still receive webhooks
 *   5. remove APP_SECRET_PREVIOUS and restart
 *
 * The script never prints a plaintext credential. It is safe to re-run: rows
 * that are already under the current key are simply re-encrypted again.
 */
import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { rotateProviderSecret } from '../src/features/payments/server/provider-secrets';

const current = process.env.APP_SECRET?.trim();
const previous = process.env.APP_SECRET_PREVIOUS?.trim();

if (!current || current.length < 32) {
  console.error('APP_SECRET must be set to the new key (at least 32 bytes).');
  process.exit(1);
}

if (!previous || previous.length < 32) {
  console.error('APP_SECRET_PREVIOUS must be set to the old key during rotation.');
  process.exit(1);
}

if (current === previous) {
  console.error('APP_SECRET and APP_SECRET_PREVIOUS are identical; nothing to rotate.');
  process.exit(1);
}

async function main() {
  const connections = await prisma.client.paymentProviderConnection.findMany({
    select: { id: true, credentialsRef: true, webhookSecretRef: true },
  });

  let updatedConnections = 0;

  for (const connection of connections) {
    const credentialsRef = rotateProviderSecret(connection.credentialsRef);
    const webhookSecretRef = rotateProviderSecret(connection.webhookSecretRef);

    if (
      credentialsRef === connection.credentialsRef &&
      webhookSecretRef === connection.webhookSecretRef
    ) {
      continue;
    }

    await prisma.client.paymentProviderConnection.update({
      where: { id: connection.id },
      data: { credentialsRef, webhookSecretRef },
      select: { id: true },
    });
    updatedConnections += 1;
  }

  const cleanupJobs = await prisma.client.providerWebhookCleanupJob.findMany({
    select: { id: true, credentialsRef: true },
  });
  let updatedJobs = 0;

  for (const job of cleanupJobs) {
    const credentialsRef = rotateProviderSecret(job.credentialsRef);

    if (credentialsRef === job.credentialsRef) {
      continue;
    }

    await prisma.client.providerWebhookCleanupJob.update({
      where: { id: job.id },
      data: { credentialsRef },
      select: { id: true },
    });
    updatedJobs += 1;
  }

  console.log(
    JSON.stringify({
      ok: true,
      scannedConnections: connections.length,
      updatedConnections,
      scannedCleanupJobs: cleanupJobs.length,
      updatedJobs,
      next: 'Verify provider webhooks, then remove APP_SECRET_PREVIOUS and restart.',
    }),
  );
}

main()
  .catch(error => {
    console.error(
      'Provider-secret rotation failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.client.$disconnect();
  });
