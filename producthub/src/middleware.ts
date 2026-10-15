import NextAuth from 'next-auth';
import { authConfig } from '@/core/auth/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ['/privacy-policy', '/terms-of-service', '/services'];
  const isPublicPage = publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Public pages luôn được truy cập
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Auth pages (login, error)
  if (pathname.startsWith('/auth/')) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Tất cả các trang còn lại yêu cầu đăng nhập
  if (!isLoggedIn) {
    const loginUrl = new URL('/auth/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
