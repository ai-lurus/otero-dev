import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/admin', '/cliente']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const needsAuth = PROTECTED.some(p => pathname === p || pathname.startsWith(`${p}/`))
  if (!needsAuth) return NextResponse.next()

  const sessionToken =
    req.cookies.get('better-auth.session_token')?.value ||
    req.cookies.get('__Secure-better-auth.session_token')?.value

  if (!sessionToken) {
    const signIn = new URL('/sign-in', req.url)
    signIn.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signIn)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/cliente/:path*'],
}
