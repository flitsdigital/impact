import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client — bypasses RLS. Server-only: never import this from a
 * file with "use client", and never expose its output of secrets.
 * Used exclusively for the public /preview/[id] page, which must read a
 * single post without an authenticated session.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
