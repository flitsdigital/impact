import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookies set in middleware
          }
        },
      },
    }
  )
}

export async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')
  return user
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB — matcht de UI-limiet

// Uploadt één bestand uit `formData` naar `bucket` onder `prefix/`. Saneert de
// bestandsnaam en dwingt de 20MB-limiet af. Geeft het storage-pad terug als `url`.
export async function uploadToBucket(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  prefix: string,
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Geen bestand ontvangen.' }
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'Bestand is groter dan 20 MB.' }

  // Letters/cijfers/punt/streepje/underscore behouden; de rest wordt '-'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 100)
  const path = `${prefix}/${Date.now()}-${safeName || 'bestand'}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }
  return { url: path }
}
