// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  console.log(
    '[callback] exchange result — user:',
    data?.user?.email ?? 'null',
    '| error:',
    error?.message ?? 'none',
  )

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  // cookies are set via createClient()/cookies()
  return NextResponse.redirect(url.origin + '/')
}
