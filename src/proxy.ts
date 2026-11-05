import { type NextRequest, NextResponse } from 'next/server';
import { isSupportedAppPath } from '@/lib/app-route';
import { SESSION_COOKIE } from '@/lib/auth-cookie';

const PROTECTED_PREFIXES = [
  '/app',
  '/onboarding',
  '/settings',
  '/websites',
  '/boards',
  '/links',
  '/pixels',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isProtectedPath(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = '/login';
    loginUrl.search = `?returnUrl=${encodeURIComponent(`${pathname}${search}`)}`;

    return NextResponse.redirect(loginUrl);
  }

  if (!isSupportedAppPath(pathname)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/app/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/websites/:path*',
    '/boards/:path*',
    '/links/:path*',
    '/pixels/:path*',
  ],
};
