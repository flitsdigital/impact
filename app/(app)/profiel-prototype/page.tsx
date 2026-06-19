'use client'

import * as React from 'react'
import { AppDrawer, AppDrawerHeader, AppDrawerBody, AppDrawerFooter } from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { VariantBar, EASE } from '@/app/(app)/gebruikers-flow-prototype/shared'
import { cn } from '@/lib/utils'

// ponytail: profiel-bewerken prototype. 3 varianten van avatar-upload + naam in een drawer.
// Alles in-memory: upload mockt via URL.createObjectURL, niets gaat naar Supabase.

type VariantId = 'klassiek' | 'inline' | 'preview'

const INITIAL = { name: 'Jordi Klavers', email: 'jordi@flits.nl', avatar: null as string | null }

// ── Gedeelde avatar-render (plain <img> ipv next/image, ivm blob: previews) ──
function AvatarImg({ src, name, size }: { src: string | null; name: string; size: number }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-3 text-fg-2"
      style={{ width: size, height: size, fontSize: size * 0.36, fontWeight: 600 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
    </span>
  )
}

// Verborgen file-input + helper die een lokale preview-URL teruggeeft.
function useFilePick(onPick: (url: string) => void) {
  const ref = React.useRef<HTMLInputElement>(null)
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onPick(URL.createObjectURL(file))
        e.target.value = ''
      }}
    />
  )
  return { open: () => ref.current?.click(), input }
}

// ── Variant 1: Klassiek — avatar + losse knoppen, naamveld, footer-acties ────
function VariantKlassiek({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [draft, setDraft] = React.useState(INITIAL)
  const { open: pick, input } = useFilePick((url) => setDraft((d) => ({ ...d, avatar: url })))

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
          <AvatarImg src={draft.avatar} name={draft.name} size={64} />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={pick}>Foto kiezen</Button>
              {draft.avatar && (
                <Button variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, avatar: null }))}>
                  Verwijderen
                </Button>
              )}
            </div>
            <span className="text-[12px] text-fg-3">JPG of PNG, max 5 MB.</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="k-name">Naam</Label>
          <Input id="k-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Volledige naam" />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="k-email">E-mailadres</Label>
          <Input id="k-email" value={draft.email} disabled />
          <span className="text-[12px] text-fg-3">E-mailadres wijzigen kan via instellingen.</span>
        </div>
        {input}
      </AppDrawerBody>

      <AppDrawerFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuleren</Button>
        <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>Opslaan</Button>
      </AppDrawerFooter>
    </AppDrawer>
  )
}

// ── Variant 2: Inline — klik op avatar = upload, autosave, geen footer ───────
function VariantInline({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [draft, setDraft] = React.useState(INITIAL)
  const [saved, setSaved] = React.useState(false)
  const { open: pick, input } = useFilePick((url) => { setDraft((d) => ({ ...d, avatar: url })); flash() })

  // ponytail: "autosave" = simpele bevestiging na elke wijziging.
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  function flash() {
    setSaved(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), 1500)
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Profiel bewerken" width={420}>
      <AppDrawerHeader>
        <span className="text-[13px] font-medium text-fg-1">Profiel</span>
        <span className={cn('flex items-center gap-1 text-[12px] text-green-500 transition-opacity', EASE, saved ? 'opacity-100' : 'opacity-0')}>
          <SvgIcon name="badge-check" size={14} /> Opgeslagen
        </span>
      </AppDrawerHeader>

      <AppDrawerBody className="items-center gap-5 pt-8">
        <button type="button" onClick={pick} className="group relative" aria-label="Profielfoto wijzigen">
          <AvatarImg src={draft.avatar} name={draft.name} size={96} />
          <span className={cn('absolute inset-0 grid place-content-center rounded-full bg-black/55 text-fg-1 opacity-0 transition-opacity', EASE, 'group-hover:opacity-100')}>
            <SvgIcon name="image-square" size={22} />
          </span>
        </button>

        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onBlur={flash}
          placeholder="Je naam"
          className="w-full bg-transparent text-center text-[18px] font-medium text-fg-1 outline-none placeholder:text-fg-3"
        />
        <span className="text-[13px] text-fg-3">{draft.email}</span>
        {input}
      </AppDrawerBody>
    </AppDrawer>
  )
}

// ── Variant 3: Live preview — form + kaart die toont hoe je verschijnt ───────
function VariantPreview({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [draft, setDraft] = React.useState(INITIAL)
  const { open: pick, input } = useFilePick((url) => setDraft((d) => ({ ...d, avatar: url })))

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Profiel bewerken" width={480}>
      <AppDrawerHeader>
        <span className="text-[13px] font-medium text-fg-1">Profiel bewerken</span>
        <Button variant="ghost" size="icon-sm" aria-label="Sluiten" onClick={() => onOpenChange(false)}>
          <SvgIcon name="x" size={16} />
        </Button>
      </AppDrawerHeader>

      <AppDrawerBody className="gap-6">
        {/* Live preview-kaart — zoals je in de app verschijnt */}
        <div className="rounded-xl border border-border-subtle bg-bg-2 p-3">
          <span className="mb-2.5 block text-[11px] uppercase tracking-wide text-fg-3">Voorbeeld</span>
          <div className="flex items-center gap-2.5">
            <AvatarImg src={draft.avatar} name={draft.name} size={36} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-fg-1">{draft.name || 'Naamloos'}</div>
              <div className="truncate text-[12px] text-fg-3">{draft.email}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AvatarImg src={draft.avatar} name={draft.name} size={56} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={pick}>Foto wijzigen</Button>
            {draft.avatar && (
              <Button variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, avatar: null }))}>Verwijderen</Button>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="p-name">Naam</Label>
          <Input id="p-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Volledige naam" />
        </div>
        {input}
      </AppDrawerBody>

      <AppDrawerFooter>
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuleren</Button>
        <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>Opslaan</Button>
      </AppDrawerFooter>
    </AppDrawer>
  )
}

const VARIANTS: { value: VariantId; label: string; hint: string }[] = [
  { value: 'klassiek', label: 'Klassiek', hint: 'Avatar met losse knoppen + footer-acties' },
  { value: 'inline', label: 'Inline', hint: 'Klik op avatar, autosave, geen footer' },
  { value: 'preview', label: 'Live preview', hint: 'Zie hoe je verschijnt terwijl je typt' },
]

export default function ProfielPrototypePage() {
  const [variant, setVariant] = React.useState<VariantId>('klassiek')
  const [open, setOpen] = React.useState(false)
  const active = VARIANTS.find((v) => v.value === variant)!

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-[18px] font-medium text-fg-1">Profiel bewerken — prototype</h1>
        <p className="mt-1 text-[13px] text-fg-2">Drie varianten van avatar-upload + naam wijzigen in een drawer.</p>
      </div>

      <VariantBar options={VARIANTS} value={variant} onChange={setVariant} />

      <div className="rounded-xl border border-border-subtle bg-bg-1 p-6">
        <p className="mb-4 text-[13px] text-fg-3">{active.hint}</p>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Open drawer</Button>
      </div>

      {variant === 'klassiek' && <VariantKlassiek open={open} onOpenChange={setOpen} />}
      {variant === 'inline' && <VariantInline open={open} onOpenChange={setOpen} />}
      {variant === 'preview' && <VariantPreview open={open} onOpenChange={setOpen} />}
    </div>
  )
}
