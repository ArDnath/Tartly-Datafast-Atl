/**
 * Disposable-email detection for account creation.
 *
 * The built-in list is intentionally small and maintained in code so the
 * behaviour is testable. Deployments can extend it with a comma-separated
 * `DISPOSABLE_EMAIL_DOMAINS` value, and can opt out with
 * `ALLOW_DISPOSABLE_EMAILS=true` for a private or test deployment.
 *
 * This is one abuse signal, not a proof of identity. It must never be the only
 * control protecting paid capacity; plan limits and rate limits remain primary.
 */

const BUILT_IN_DOMAINS = new Set([
  '10minutemail.com',
  'discard.email',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'sharklasers.com',
  'spamgourmet.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]);

function configuredDomains() {
  return (process.env.DISPOSABLE_EMAIL_DOMAINS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export function disposableEmailDomains(): Set<string> {
  return new Set([...BUILT_IN_DOMAINS, ...configuredDomains()]);
}

export function emailDomain(email: string) {
  const at = email.lastIndexOf('@');

  if (at < 1 || at === email.length - 1) {
    return null;
  }

  return email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

export function isDisposableEmail(email: string) {
  if (process.env.ALLOW_DISPOSABLE_EMAILS === 'true') {
    return false;
  }

  const domain = emailDomain(email);

  if (!domain) {
    return false;
  }

  const domains = disposableEmailDomains();

  if (domains.has(domain)) {
    return true;
  }

  // Treat a subdomain of a known disposable provider as disposable too, for
  // example `inbox.mailinator.com`.
  return [...domains].some(known => domain.endsWith(`.${known}`) && domain !== known);
}
