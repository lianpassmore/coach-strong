// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/', '/login', '/api/elevenlabs', '/auth/callback']

const GATE_EXEMPT = [
  '/onboarding',
  '/discovery',
  '/voice-session',
  '/api/',
  '/admin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log(
    '[middleware]',
    pathname,
    '| user:',
    user?.email ?? 'null',
    '| error:',
    userError?.message ?? 'none',
  )
  console.log(
    '[middleware] cookies:',
    request.cookies.getAll().map((c) => c.name),
  )

  // If not authenticated and trying to access a protected route → go to /login
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    console.log('[middleware] redirecting to /login because user is null on', pathname)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from / and /login to /dashboard
  if (user && (pathname === '/' || pathname === '/login')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Onboarding / discovery gating
  if (user && !GATE_EXEMPT.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, discovery_completed, is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      if (profile && !profile.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      if (profile && profile.onboarding_completed && !profile.discovery_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/discovery'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
