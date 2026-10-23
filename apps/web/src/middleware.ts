import { NextResponse, NextRequest } from 'next/server';

// Protected dashboard routes
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/roadmap',
  '/quiz',
  '/tutor',
  '/goals',
  '/skills',
  '/settings',
  '/onboarding',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token');

  // Check if requested path is protected
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );

  // If path is protected and no session exists, redirect to login
  if (isProtected && !refreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // If user is logged in but trying to access auth pages, redirect to dashboard
  const isAuthPage = pathname.startsWith('/auth/');
  if (isAuthPage && refreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml
     * - favicon assets, logs, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.ts|sitemap.xml|icon.svg|og-image.png).*)',
  ],
};
