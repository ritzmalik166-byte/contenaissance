import { NextResponse } from 'next/server';

export function middleware() {
  // Simplified middleware to avoid redirects during build
  return NextResponse.next();
}

export const config = {
  // No matchers needed for now
  matcher: [],
};
