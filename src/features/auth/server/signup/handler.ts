import { NextResponse } from 'next/server';
import { resolveAuthSession } from '@/lib/auth-session';
import { getSessionTokenFromRequest } from '@/lib/auth-cookie';
import { getPublicOrigin } from '@/lib/get-base-url';
import { logger } from '@/lib/logger';
import { isOnboardingRequired } from '@/features/auth/server/post-signin';
import { resolveStartDestination } from './handoff';

/**
 * The universal "get started" hop.
 *
 * Signed-out visitors see the login screen first. A valid session skips the
 * provider round trip, so an existing customer who enters a new website lands
 * in the add-website flow instead of being sent back through Google.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  let hasSession = false;
  let onboardingRequired = false;

  try {
    const token = getSessionTokenFromRequest(request);
    const session = token ? await resolveAuthSession(token) : null;

    if (session) {
      hasSession = true;
      onboardingRequired = await isOnboardingRequired(session.userId);
    }
  } catch (cause) {
    // Starting a sign-in must not fail because the session read failed. The
    // login page is a safe fallback; it never grants access by itself.
    logger.warn('auth.start_session_lookup_failed', {
      error: cause instanceof Error ? cause.message : String(cause),
    });
  }

  const destination = resolveStartDestination({
    requestedReturnUrl: url.searchParams.get('returnUrl'),
    website: url.searchParams.get('website'),
    hasSession,
    onboardingRequired,
  });
  const response = NextResponse.redirect(new URL(destination, getPublicOrigin(request)));

  response.headers.set('Cache-Control', 'no-store');

  return response;
}
