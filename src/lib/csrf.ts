import { getBaseUrl } from '@/lib/get-base-url';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isUnsafeMethod(method: string) {
  return !SAFE_METHODS.has(method.toUpperCase());
}

/**
 * Origin/Referer check for state-changing requests.
 *
 * Browsers always attach one of these to cross-origin form posts and fetch
 * calls, so a mismatching value is a reliable CSRF signal. A missing value is
 * allowed for non-browser clients (CLI, server-to-server), which have no
 * ambient cookie to abuse. Authentication cookies additionally use
 * SameSite=Lax.
 */
export function isSameOriginRequest(request: Request) {
  const source = request.headers.get('origin') || request.headers.get('referer');

  if (!source) {
    return true;
  }

  let sourceOrigin: string;

  try {
    sourceOrigin = new URL(source).origin;
  } catch {
    return false;
  }

  const requestOrigin = getBaseUrl(request).origin;
  const configuredOrigin = getConfiguredOrigin();

  return (
    sourceOrigin === requestOrigin || (configuredOrigin ? sourceOrigin === configuredOrigin : false)
  );
}

export function rejectCrossOriginRequest(request: Request) {
  if (!isUnsafeMethod(request.method)) {
    return null;
  }

  return isSameOriginRequest(request) ? null : true;
}

function getConfiguredOrigin() {
  const value = process.env.APP_URL?.trim();

  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
