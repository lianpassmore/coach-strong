import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that anyone can see (no login required)
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback']

// Routes that are allowed even if the user hasn't finished onboarding/discovery
const GATE_EXEMPT = ['/onboarding', '/discovery', '/voice-session', '/api', '/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // 1. Initialize Supabase SSR Client
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
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 2. Refresh session (Essential for auth to work)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  // 3. Logic: If NOT logged in and trying to access a private page
  if (!user && !PUBLIC_ROUTES.includes(pathname) && !GATE_EXEMPT.some(p => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. Logic: If LOGGED IN and trying to access login/landing page
  if (user && (pathname === '/' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 5. Logic: Onboarding & Discovery Gates
  // Only check this if the user is logged in and not on a "gate exempt" page
  if (user && !GATE_EXEMPT.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, discovery_completed, is_admin')
      .eq('id', user.id)
      .single()

    // Coaches/Admins are allowed to bypass the gates
    if (!profile?.is_admin) {
      // Force Onboarding
      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
      // Force Discovery Voice Interview
      if (!profile?.discovery_completed) {
        return NextResponse.redirect(new URL('/discovery', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/logos/manifest
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}