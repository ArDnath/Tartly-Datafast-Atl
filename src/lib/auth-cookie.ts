/**
 * Session cookie helpers.
 *
 * The browser never receives the session token in JavaScript-readable
 * storage: the cookie is HttpOnly and SameSite=Lax. The login response body
 * does not contain the token either; server-to-server integrations use API
 * keys instead.
 */

export const SESSION_COOKIE = 'rl_session';

/** 30 days. Short enough to limit a stolen-cookie window, long enough to stay signed in. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function getSessionTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get('cookie');

  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();

    if (name === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}

export function serializeSessionCookie(token: string, expiresAt: Date) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return serializeCookie([
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    ...(isSecureCookie() ? ['Secure'] : []),
  ]);
}

export function clearSessionCookie() {
  return serializeCookie([
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    ...(isSecureCookie() ? ['Secure'] : []),
  ]);
}

function serializeCookie(parts: string[]) {
  return parts.join('; ');
}

function isSecureCookie() {
  if (process.env.COOKIE_SECURE === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true';
}
