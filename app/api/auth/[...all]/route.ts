import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { allowSignup } from '@/lib/demo'

const handlers = toNextJsHandler(auth)

export const GET = handlers.GET

// Public self-registration is disabled unless ALLOW_SIGNUP=true: accounts are
// created only by admins (or scripts) that call auth.api directly.
export async function POST(req: NextRequest) {
  if (!allowSignup && req.nextUrl.pathname.startsWith('/api/auth/sign-up')) {
    return NextResponse.json(
      { message: 'El registro público está deshabilitado. Agenda una demo para obtener acceso.' },
      { status: 403 },
    )
  }
  return handlers.POST(req)
}
