import { uuid } from '@/lib/crypto';

export const TALIVIA_VISITOR_COOKIE = 'talivia_visitor_id';
export const TALIVIA_SESSION_COOKIE = 'talivia_session_id';
export const TALIVIA_SESSION_METADATA_KEY = 'talivia_session_id';

/**
 * The stored visitor/session token width. The cross-domain linker carries the
 * same width so both domains derive the same visitor UUID.
 */
export const TRACKING_TOKEN_MAX_LENGTH = 100;

export function getTrackingVisitorId(websiteId: string, visitorToken: string) {
  return uuid(websiteId, 'visitor', visitorToken);
}

export function getTrackingSessionId(websiteId: string, sessionToken: string) {
  return uuid(websiteId, 'session', sessionToken);
}
