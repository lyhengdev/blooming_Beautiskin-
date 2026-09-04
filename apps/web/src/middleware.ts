import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_ROUTES = ['/admin'];
const PROTECTED_ROUTES = ['/dashboard', '/checkout'];
// If already logged in, visiting these pages should redirect to dashboard
const AUTH_ROUTES = ['/login', '/register'];

/**
 * Verify the JWT stored in the 'token' cookie (written by authStore on the
 * frontend domain after login).
 * Returns true only when the token exists, is signed with our secret, and has
 * not expired.
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('token')?.value;
  if (!token) return false;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set — protected routes will always redirect to login.');
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    // Expired, malformed, or wrong secret.
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAdmin = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const needsAuth = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  const authenticated = await isAuthenticated(request);

  // Already logged in → don't show login/register pages, go to dashboard
  if (isAuthPage && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protected page → must be logged in
  if ((needsAdmin || needsAuth) && !authenticated) {
    const loginUrl = new URL(
      '/login?returnTo=' + encodeURIComponent(pathname),
      request.url
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on auth pages too so we can redirect away if already logged in
  matcher: ['/admin/:path*', '/dashboard/:path*', '/checkout/:path*', '/login', '/register'],
};
