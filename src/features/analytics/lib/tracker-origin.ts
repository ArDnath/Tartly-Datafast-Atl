/**
 * Optional tracker-origin enforcement.
 *
 * A website ID is public by design, so anyone can copy a snippet. The domain
 * check reduces casual event injection when the owner has configured a domain.
 * It is opt-in (`ENFORCE_TRACKER_ORIGIN=true`) because a wrong domain would
 * silently stop legitimate collection during onboarding.
 *
 * Rules:
 * - no configured domain, no hostname, or enforcement disabled => allow;
 * - exact host or a subdomain of the configured host => allow;
 * - a configured `www.` prefix is normalized away on both sides.
 */

export function normalizeTrackerHost(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  let host = value.trim().toLowerCase();

  if (!host) {
    return null;
  }

  try {
    if (host.includes('://')) {
      host = new URL(host).hostname;
    } else if (/[/?#]/.test(host)) {
      host = new URL(`https://${host}`).hostname;
    } else {
      host = host.split(':')[0];
    }
  } catch {
    return null;
  }

  return host.replace(/\.$/, '').replace(/^www\./, '') || null;
}

export interface TrackerOriginInput {
  configuredDomain?: string | null;
  hostname?: string | null;
  origin?: string | null;
  enforce?: boolean;
}

export function isTrackerOriginAllowed({
  configuredDomain,
  hostname,
  origin,
  enforce = process.env.ENFORCE_TRACKER_ORIGIN === 'true',
}: TrackerOriginInput) {
  if (!enforce) {
    return true;
  }

  const configured = normalizeTrackerHost(configuredDomain);

  if (!configured) {
    return true;
  }

  const candidate =
    normalizeTrackerHost(hostname) || (origin ? normalizeTrackerHost(origin) : null);

  if (!candidate) {
    // Server-side events and older clients do not always send a host.
    return true;
  }

  return candidate === configured || candidate.endsWith(`.${configured}`);
}
