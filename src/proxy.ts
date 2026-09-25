import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const LOCALE_COOKIE = 'ttp-locale'
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Supabase auth + SEO locale proxy.
 *
 * Two responsibilities:
 *
 * 1. **Supabase session refresh** — refreshes the session cookie on every
 *    request. Without this, expired sessions would log users out until they
 *    manually re-sign-in. The proxy silently refreshes the JWT and sets the
 *    new cookie.
 *
 * 2. **Locale detection (SEO)** — on the first visit (no `ttp-locale` cookie),
 *    reads the `Accept-Language` header and sets a `ttp-locale=es` or
 *    `ttp-locale=en` cookie. The layout reads this cookie server-side to
 *    render `<html lang="es">` for Spanish-speaking visitors. Also sets
 *    `Vary: Accept-Language` on the response so Google knows the content
 *    varies by browser language.
 *
 * (Renamed from middleware.ts per Next.js 16 deprecation — the "middleware"
 * file convention is deprecated, use "proxy" instead.)
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // ── SEO: Vary: Accept-Language ────────────────────────────────────────
  // Tells Google (and any CDN) that the response varies by Accept-Language.
  // This is the SEO-correct way to handle same-URL multilingual content
  // without hreflang (which Google ignores when both languages point to the
  // same URL).
  response.headers.set('Vary', 'Accept-Language')

  // ── SEO: Locale cookie detection ─────────────────────────────────────
  // On first visit (no ttp-locale cookie), detect from Accept-Language.
  // The layout.tsx reads this cookie to set <html lang> server-side.
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (!existingLocale) {
    const acceptLang = request.headers.get('accept-language') || ''
    // Parse: "es-AR,es;q=0.9,en;q=0.8" → first language wins
    const languages = acceptLang
      .split(',')
      .map((l) => l.trim().split(';')[0].split('-')[0].toLowerCase())
      .filter(Boolean)
    const detectedLocale = languages[0] === 'es' ? 'es' : 'en'

    response.cookies.set(LOCALE_COOKIE, detectedLocale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: true,
      httpOnly: false, // needs to be readable by client-side JS (Zustand)
    })
  }

  // ── Supabase auth session refresh ─────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh the session — this is the key call. It reads the current JWT,
  // refreshes it if expired, and sets the updated cookie on the response.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static, _next/image, favicon.ico, public assets
     * - api/auth/callback (Supabase OAuth callback)
     * - api/public/* (public read-only endpoints — no auth needed)
     * - share/* (public share pages — no auth needed)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/auth/callback|api/public|share).*)',
  ],
}
