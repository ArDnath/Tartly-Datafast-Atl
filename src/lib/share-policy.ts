/**
 * Public share links are read-only report URLs. They carry a signed token and
 * an expiry so a link leaked in a chat does not become a permanent data leak.
 */
export const SHARE_LINK_TTL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function getShareExpiry(now: Date = new Date()) {
  return new Date(now.getTime() + SHARE_LINK_TTL_DAYS * DAY_MS);
}

export function isShareLinkActive(
  share: { expiresAt?: Date | null },
  now: Date = new Date(),
): boolean {
  return Boolean(share.expiresAt && share.expiresAt.getTime() > now.getTime());
}
