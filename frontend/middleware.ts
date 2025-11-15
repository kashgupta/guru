import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // If user is on the phone page, allow access
  if (pathname === '/phone') {
    return NextResponse.next();
  }

  // Check if user has submitted phone number (stored in cookie or header)
  const hasPhone = request.cookies.get('user_phone');

  // If accessing main page without phone, redirect to phone page
  if (pathname === '/' && !hasPhone) {
    return NextResponse.redirect(new URL('/phone', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/',
    '/phone',
  ],
};
