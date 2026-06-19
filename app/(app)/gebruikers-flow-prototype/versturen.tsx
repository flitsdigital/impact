'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Avatar } from '@/components/ui/Avatar'
import { EASE, isEmail, RolePills, VariantBar, type RoleId } from './shared'

// ponytail: 3 plaatsingen voor het uitnodig-moment. Mail zelf = Supabase-template (geen design hier).
// Versturen wordt gesimuleerd met een korte timeout → daarna 'pending' rij.

type Variant = 'inline' | 'drawer' | 'bulk'
type Pending = { email: string; role: RoleId }

function useInvite() {
  const [pending, setPending] = React.useState<Pending[]>([{ email: 'noa@bureau.nl', role: 'lezer' }])
  const [sending, setSending] = React.useState(false)
  const send = (items: Pending[], done?: () => void) => {
    setSending(true)
    setTimeout(() => {
      setPending((p) => [...items, ...p.filter((x) => !items.some((i) => i.email === x.email))])
      setSending(false)
      done?.()
    }, 700)
  }
  return { pending, sending, send }
}

function PendingList({ items }: { items: Pending[] }) {
  if (!items.length) return null
  return (
    <div className="mt-5 border-t border-border-subtle pt-4">
      <p className="mb-2 text-[12px] font-medium text-fg-2">In afwachting ({items.length})</p>
      <ul className="space-y-1.5">
        {items.map((p) => (
          <li key={p.email} className="flex items-center gap-2 text-[13px] text-fg-1">
            <SvgIcon name="user-clock" size={14} className="text-orange-500" />
            <span className="flex-1 truncate">{p.email}</span>
            <span className="text-[12px] text-fg-3">wacht op acceptatie</span>
            <button className="text-[12px] text-fg-3 hover:text-fg-1">Opnieuw</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Chip-input + rol, gedeeld door inline & drawer.
function InviteForm({ onSend, sending }: { onSend: (items: Pending[]) => void; sending: boolean }) {
  const [draft, setDraft] = React.useState('')
  const [emails, setEmails] = React.useState<string[]>([])
  const [role, setRole] = React.useState<RoleId>('lid')
  const add = () => {
    const valid = draft.split(/[,\s]+/).map((s) => s.trim()).filter((p) => isEmail(p) && !emails.includes(p))
    if (valid.length) setEmails((e) => [...e, ...valid])
    setDraft('')
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-1 px-2 py-2 focus-within:border-border-strong">
        {emails.map((em) => (
          <span key={em} className="flex items-center gap-1 rounded-md bg-bg-3 py-0.5 pr-1 pl-2 text-[12px] text-fg-1">
            {em}
            <button type="button" onClick={() => setEmails((e) => e.filter((x) => x !== em))} className="text-fg-3 hover:text-fg-1"><SvgIcon name="x" size={12} /></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } if (e.key === 'Backspace' && !draft) setEmails((x) => x.slice(0, -1)) }}
          onBlur={add}
          placeholder={emails.length ? '' : 'naam@bedrijf.nl, …'}
          className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[13px] text-fg-1 outline-none placeholder:text-fg-3"
        />
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[12px] font-medium text-fg-2">Rol</p>
        <RolePills value={role} onChange={setRole} />
      </div>
      <Button
        className="mt-5 w-full"
        disabled={!emails.length || sending}
        onClick={() => { onSend(emails.map((email) => ({ email, role }))); setEmails([]) }}
      >
        {sending ? <><SvgIcon name="circle-notch" size={14} className="animate-spin" /> Versturen…</>
          : <><SvgIcon name="user-plus" size={14} /> {emails.length ? `Verstuur ${emails.length} uitnodiging${emails.length > 1 ? 'en' : ''}` : 'Voeg adressen toe'}</>}
      </Button>
    </>
  )
}

function InlineVariant() {
  const { pending, sending, send } = useInvite()
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="mb-4 text-[13px] text-fg-2">Het uitnodig-paneel staat direct op de gebruikerspagina — geen extra klik om te beginnen.</p>
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <InviteForm sending={sending} onSend={(items) => send(items)} />
        <PendingList items={pending} />
      </div>
    </div>
  )
}

function DrawerVariant() {
  const { pending, sending, send } = useInvite()
  const [open, setOpen] = React.useState(false)
  return (
    <div className="relative mx-auto h-full w-full max-w-2xl overflow-hidden">
      <p className="mb-4 text-[13px] text-fg-2">De pagina toont de lijst; uitnodigen gebeurt in een aparte drawer. Houdt de hoofdpagina rustig.</p>
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-fg-2">{pending.length} openstaande uitnodiging(en)</span>
          <Button size="sm" onClick={() => setOpen(true)}><SvgIcon name="user-plus" size={13} /> Nodig uit</Button>
        </div>
        <PendingList items={pending} />
      </div>

      {/* Gesimuleerde drawer binnen het paneel */}
      <div className={cn('absolute inset-0 z-30 transition-opacity', EASE, open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
        <div className={cn('absolute top-0 right-0 h-full w-[360px] border-l border-border-subtle bg-bg-1 p-5 transition-transform', EASE, open ? 'translate-x-0' : 'translate-x-full')}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-fg-1">Nodig collega's uit</h3>
            <button onClick={() => setOpen(false)} className="text-fg-3 hover:text-fg-1"><SvgIcon name="x" size={16} /></button>
          </div>
          <InviteForm sending={sending} onSend={(items) => send(items, () => setOpen(false))} />
        </div>
      </div>
    </div>
  )
}

function BulkVariant() {
  const { pending, sending, send } = useInvite()
  const [text, setText] = React.useState('')
  const [role, setRole] = React.useState<RoleId>('lid')
  const tokens = text.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
  const valid = Array.from(new Set(tokens.filter(isEmail)))
  const invalid = tokens.filter((t) => !isEmail(t))
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="mb-4 text-[13px] text-fg-2">Plak een hele lijst ineens — handig bij het onboarden van een compleet team.</p>
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={'lisa@klant.nl, mark@klant.nl\nnoa@bureau.nl …'}
          className="w-full resize-none rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5 font-[Inter] text-[13px] text-fg-1 outline-none placeholder:text-fg-3 focus:border-border-strong"
        />
        {tokens.length > 0 && (
          <div className="mt-3 flex items-center gap-3 text-[12px]">
            <span className="flex items-center gap-1 text-green-500"><SvgIcon name="badge-check" size={13} />{valid.length} geldig</span>
            {invalid.length > 0 && <span className="flex items-center gap-1 text-fg-3"><SvgIcon name="triangle-exclamation" size={13} />{invalid.length} overgeslagen</span>}
          </div>
        )}
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-medium text-fg-2">Rol voor de hele lijst</p>
          <RolePills value={role} onChange={setRole} />
        </div>
        <Button className="mt-5 w-full" disabled={!valid.length || sending} onClick={() => { send(valid.map((email) => ({ email, role }))); setText('') }}>
          {sending ? <><SvgIcon name="circle-notch" size={14} className="animate-spin" /> Versturen…</>
            : <><SvgIcon name="upload" size={14} /> {valid.length ? `Verstuur ${valid.length} uitnodigingen` : 'Plak adressen om te starten'}</>}
        </Button>
        <PendingList items={pending} />
      </div>
    </div>
  )
}

export function Versturen() {
  const [v, setV] = React.useState<Variant>('inline')
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-center">
        <VariantBar
          value={v}
          onChange={setV}
          options={[{ value: 'inline', label: 'Inline paneel' }, { value: 'drawer', label: 'Drawer' }, { value: 'bulk', label: 'Bulk plakken' }]}
        />
      </div>
      <div className="flex-1">
        {v === 'inline' && <InlineVariant />}
        {v === 'drawer' && <DrawerVariant />}
        {v === 'bulk' && <BulkVariant />}
      </div>
    </div>
  )
}
