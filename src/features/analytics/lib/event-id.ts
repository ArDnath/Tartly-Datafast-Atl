import { uuid } from '@/lib/crypto';

/**
 * Derive the stored event id from a client idempotency key.
 *
 * The entity id (website, link, or pixel) is part of the hash so two tenants
 * that send the same client key never collide. The application secret makes
 * the key unguessable from the public entity id alone.
 */
export function getClientEventId(sourceId: string, clientEventId: string) {
  return uuid(sourceId, 'client-event', clientEventId);
}
