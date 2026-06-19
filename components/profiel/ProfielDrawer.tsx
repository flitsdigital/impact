'use client'

import * as React from 'react'
import { AppDrawer, AppDrawerHeader, AppDrawerBody, AppDrawerFooter } from '@/components/ui/AppDrawer'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Profiel bewerken — avatar + naam. Volledig client-side: upload naar de
 * `avatars`-bucket en `auth.updateUser`. De USER_UPDATED-event ververst de
 * auth-store (zie AuthProvider), dus de TopBar-avatar werkt vanzelf bij.
 */
export function ProfielDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const user = useAuthStore((s) => s.user)

  const [name, setName] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null) // blob: voor lokale preview
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  // Seed (her)laden zodra de drawer opent of de gebruiker wijzigt.
  React.useEffect(() => {
    if (!open || !user) return
    setName(user.user_metadata?.full_name ?? '')
    setAvatarUrl(user.user_metadata?.avatar_url ?? null)
    setFile(null)
    setPreview(null)
    setError(null)
  }, [open, user])

  // Object-URL opruimen.
  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function pickFile(f: File) {
    if (f.size > MAX_BYTES) { setError('Bestand is groter dan 5 MB.'); return }
    setError(null)
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  function removeAvatar() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setAvatarUrl(null)
  }

  async function save() {
    if (!user) return
    setSaving(true)
    setError(null)
    const supabase = createClient()

    let nextAvatarUrl = avatarUrl
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      nextAvatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    const { error: updErr } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), avatar_url: nextAvatarUrl },
    })
    setSaving(false)
    if (updErr) { setError(updErr.message); return }
    onOpenChange(false)
  }

  const shownAvatar = preview ?? avatarUrl

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Profiel bewerken" width={460}>
      <AppDrawerHeader>
        <span className="text-[13px] font-medium text-fg-1">Profiel bewerken</span>
        <Button variant="ghost" size="icon-sm" aria-label="Sluiten" onClick={() => onOpenChange(false)}>
          <SvgIcon name="x" size={16} />
        </Button>
      </AppDrawerHeader>

      <AppDrawerBody className="gap-6">
        <div className="flex items-center gap-4">
          {preview ? (
            // next/image kan geen blob: aan; lokale preview als plain img. ponytail:
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-16 shrink-0 rounded-full object-cover" />
          ) : (
            <Avatar src={shownAvatar} name={name || user?.email} size={64} />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Foto kiezen</Button>
              {shownAvatar && (
                <Button variant="ghost" size="sm" onClick={removeAvatar}>Verwijderen</Button>
              )}
            </div>
            <span className="text-[12px] text-fg-3">JPG of PNG, max 5 MB.</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="profiel-naam">Naam</Label>
          <Input
            id="profiel-naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Volledige naam"
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="profiel-email">E-mailadres</Label>
          <Input id="profiel-email" value={user?.email ?? ''} disabled />
          <span className="text-[12px] text-fg-3">E-mailadres wijzigen kan via instellingen.</span>
        </div>

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }}
        />
      </AppDrawerBody>

      <AppDrawerFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
        <Button variant="default" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Opslaan…' : 'Opslaan'}
        </Button>
      </AppDrawerFooter>
    </AppDrawer>
  )
}
