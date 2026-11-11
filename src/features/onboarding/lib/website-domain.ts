/**
 * Normalize a domain typed on the landing page or in onboarding. Accepts a
 * full URL, a bare host, or stray whitespace and returns the hostname people
 * expect to see in the website field.
 */
export function normalizeWebsiteDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/[/?#].*$/, '');
}
