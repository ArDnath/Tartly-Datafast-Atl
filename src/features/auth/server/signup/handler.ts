import { NextResponse } from 'next/server';
import { withWebsiteReturnUrl } from '@/features/auth/lib/auth-return-url';
import { getPublicOrigin } from '@/lib/get-base-url';

/**
 * The signup screen no longer exists: "Start tracking" and every pricing CTA
 * continue through Google, carrying the entered website into onboarding.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const returnUrl = withWebsiteReturnUrl(
    url.searchParams.get('returnUrl') ?? '/onboarding',
    url.searchParams.get('website'),
  );
  const target = new URL('/api/auth/google', getPublicOrigin(request));

  target.searchParams.set('returnUrl', returnUrl);

  const response = NextResponse.redirect(target);
  response.headers.set('Cache-Control', 'no-store');

  return response;
}
