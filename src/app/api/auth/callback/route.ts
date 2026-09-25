/**
 * GET /api/auth/callback
 *
 * Supabase OAuth callback handler. After the OAuth provider (Google, etc.)
 * redirects back to the app, Supabase exchanges the code for a session
 * and sets the auth cookie. This route just closes the loop and redirects
 * to the home page.
 *
 * The actual code exchange is handled by Supabase's `exchangeCodeForSession`.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    })

    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to the app root — the AuthProvider will detect the session
  // and route to My Events.
  return NextResponse.redirect(requestUrl.origin)
}
