/**
 * Supabase BROWSER client — safe to import from client components.
 *
 * This file MUST NOT import any server-only APIs (next/headers, next/server).
 * Client components import `getBrowserClient` from here.
 */

import { createBrowserClient as createBrowserClientSupabase } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

let browserClient: ReturnType<typeof createBrowserClientSupabase> | null = null

/**
 * Get the shared Supabase browser client. Creates it once on first call.
 */
export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClientSupabase(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

/** @deprecated Use getBrowserClient() instead. */
export function createBrowserClient() {
  return getBrowserClient()
}
