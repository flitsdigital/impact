'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

// ponytail: één prototype-pagina met 5 fundamenteel verschillende manieren om gebruikers
// toe te voegen. Mockdata, geen DB, geen server-actions. Geen DemoBlock op /design-system
// tot er een winnaar gekozen is — dan verhuist die ene variant naar een echt component.

const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]'

// ── Gedeeld ──────────────────────────────────────────────────────────────────
type RoleId = 'beheerder' | 'lid' | 'lezer'
const ROLES: { id: RoleId; label: string; hint: string; tint: string }[] = [
  { id: 'beheerder', label: 'Beheerder', hint: 'Volledige toegang + facturatie', tint: 'text-purple-500' },
  { id: 'lid', label: 'Lid', hint: 'Werkt mee aan klanten & content', tint: 'text-blue-500' },
  { id: 'lezer', label: 'Alleen lezen', hint: 'Bekijkt alles, wijzigt niets', tint: 'text-fg-2' },
]
const roleOf = (id: RoleId) => ROLES.find((r) => r.id === id)!

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

type Member = { id: string; name: string; email: string; role: RoleId }
const TEAM: Member[] = [
  { id: 'u1', name: 'Jordi Klavers', email: 'jordi@flits.nl', role: 'beheerder' },
  { id: 'u2', name: 'Sam Lee', email: 'sam@flits.nl', role: 'lid' },
  { id: 'u3', name: 'Mees Peters', email: 'mees@flits.nl', role: 'lid' },
]

function RolePills({ value, onChange }: { value: RoleId; onChange: (r: RoleId) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
            EASE,
            value === r.id
              ? 'border-border-strong bg-bg-3 text-fg-1'
              : 'border-border-subtle text-fg-2 hover:text-fg-1',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

function Panel({ title, blurb, children }: { title: string; blurb: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="text-[15px] font-medium text-fg-1">{title}</h2>
      <p className="mt-1 mb-5 text-[13px] text-fg-2">{blurb}</p>
      {children}
    </div>
  )
}

// ── 1. Uitnodigingslink ──────────────────────────────────────────────────────
function InviteLink() {
  const [role, setRole] = React.useState<RoleId>('lid')
  const [expiry, setExpiry] = React.useState<'7d' | '30d' | 'nooit'>('7d')
  const [active, setActive] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const [token, setToken] = React.useState('a7f3-2x9k')
  const link = `https://app.flits.nl/join/${token}`

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const regen = () => setToken(Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6))

  return (
    <Panel
      title="Deel een uitnodigingslink"
      blurb="Laagste drempel: één link die je in WhatsApp of Slack plakt. Iedereen met de link wordt lid met de gekozen rol."
    >
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5">
          <SvgIcon name="link" size={16} className="text-fg-3" />
          <span className={cn('flex-1 truncate font-[Inter] text-[13px]', active ? 'text-fg-1' : 'text-fg-3 line-through')}>
            {link}
          </span>
          <Button size="sm" variant={copied ? 'secondary' : 'default'} onClick={copy} disabled={!active}>
            <SvgIcon name={copied ? 'check' : 'link'} size={13} />
            {copied ? 'Gekopieerd' : 'Kopieer'}
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-fg-2">Rol voor nieuwe leden</p>
            <RolePills value={role} onChange={setRole} />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-fg-2">Verloopt na</p>
            <SegmentedControl
              value={expiry}
              onChange={(v) => setExpiry(v as typeof expiry)}
              options={[
                { value: '7d', label: '7 dagen' },
                { value: '30d', label: '30 dagen' },
                { value: 'nooit', label: 'Nooit' },
              ]}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-4">
          <label className="flex items-center gap-2 text-[13px] text-fg-2">
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((a) => !a)}
              className={cn('relative h-5 w-9 rounded-full transition-colors', EASE, active ? 'bg-green-500' : 'bg-bg-3')}
            >
              <span className={cn('absolute top-0.5 size-4 rounded-full bg-white transition-all', EASE, active ? 'left-[18px]' : 'left-0.5')} />
            </button>
            Link {active ? 'actief' : 'uit'}
          </label>
          <Button size="sm" variant="ghost" onClick={regen}>
            <SvgIcon name="refresh" size={13} /> Nieuwe link
          </Button>
        </div>
      </div>
    </Panel>
  )
}

// ── 2. E-mail uitnodigingen (chips) ──────────────────────────────────────────
function EmailInvite() {
  const [draft, setDraft] = React.useState('')
  const [emails, setEmails] = React.useState<string[]>(['lisa@klant.nl'])
  const [role, setRole] = React.useState<RoleId>('lid')
  const [sent, setSent] = React.useState<string[]>([])

  const add = () => {
    const parts = draft.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
    const valid = parts.filter((p) => isEmail(p) && !emails.includes(p))
    if (valid.length) setEmails((e) => [...e, ...valid])
    setDraft('')
  }
  const send = () => {
    setSent((s) => [...emails, ...s])
    setEmails([])
  }

  return (
    <Panel
      title="Nodig uit per e-mail"
      blurb="De klassieker: typ adressen, kies een rol, verstuur. Iedereen krijgt een persoonlijke uitnodiging in z'n inbox."
    >
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-1 px-2 py-2 focus-within:border-border-strong">
          {emails.map((em) => (
            <span key={em} className="flex items-center gap-1 rounded-md bg-bg-3 py-0.5 pr-1 pl-2 text-[12px] text-fg-1">
              {em}
              <button type="button" onClick={() => setEmails((e) => e.filter((x) => x !== em))} className="text-fg-3 hover:text-fg-1">
                <SvgIcon name="x" size={12} />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
              if (e.key === 'Backspace' && !draft) setEmails((x) => x.slice(0, -1))
            }}
            onBlur={add}
            placeholder={emails.length ? '' : 'naam@bedrijf.nl, …'}
            className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[13px] text-fg-1 outline-none placeholder:text-fg-3"
          />
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-medium text-fg-2">Iedereen krijgt de rol</p>
          <RolePills value={role} onChange={setRole} />
        </div>

        <Button className="mt-5 w-full" disabled={!emails.length} onClick={send}>
          <SvgIcon name="user-plus" size={14} />
          {emails.length ? `Verstuur ${emails.length} uitnodiging${emails.length > 1 ? 'en' : ''}` : 'Voeg e-mailadressen toe'}
        </Button>

        {sent.length > 0 && (
          <div className="mt-5 border-t border-border-subtle pt-4">
            <p className="mb-2 text-[12px] font-medium text-fg-2">In afwachting</p>
            <ul className="space-y-1.5">
              {sent.map((em) => (
                <li key={em} className="flex items-center gap-2 text-[13px] text-fg-1">
                  <SvgIcon name="user-clock" size={14} className="text-orange-500" />
                  <span className="flex-1">{em}</span>
                  <span className="text-[12px] text-fg-3">wacht op acceptatie</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  )
}

// ── 3. Spotlight / snel toevoegen (keyboard-first) ───────────────────────────
function Spotlight() {
  const [q, setQ] = React.useState('')
  const [role, setRole] = React.useState<RoleId>('lid')
  const [added, setAdded] = React.useState<{ value: string; role: RoleId }[]>([])
  const cycleRole = () => {
    const i = ROLES.findIndex((r) => r.id === role)
    setRole(ROLES[(i + 1) % ROLES.length].id)
  }
  const commit = () => {
    if (!q.trim()) return
    setAdded((a) => [{ value: q.trim(), role }, ...a])
    setQ('')
  }
  return (
    <Panel
      title="Snel toevoegen"
      blurb="Voor wie z'n handen op het toetsenbord houdt. Typ een naam of e-mail, Tab wisselt de rol, Enter voegt toe. Geen modals."
    >
      <div className="rounded-xl border border-border-strong bg-bg-2 shadow-lg">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <SvgIcon name="magnifying-glass" size={16} className="text-fg-3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Tab') { e.preventDefault(); cycleRole() }
            }}
            placeholder="Naam of e-mail…"
            className="flex-1 bg-transparent text-[14px] text-fg-1 outline-none placeholder:text-fg-3"
          />
          <button
            type="button"
            onClick={cycleRole}
            className={cn('rounded-md border border-border-subtle px-2 py-1 text-[12px] transition-colors', EASE, roleOf(role).tint)}
          >
            {roleOf(role).label} <kbd className="ml-1 text-fg-3">⇥</kbd>
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2 text-[11px] text-fg-3">
          <span>{isEmail(q) ? 'Nodigt extern persoon uit' : q ? 'Zoekt in team & contacten' : 'Begin met typen'}</span>
          <span><kbd>↵</kbd> toevoegen</span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {added.map((a, i) => (
          <div
            key={a.value + i}
            className={cn('flex items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-2 px-3 py-2', 'animate-in fade-in slide-in-from-top-1 duration-200')}
          >
            <Avatar name={isEmail(a.value) ? a.value[0] : a.value} size={24} />
            <span className="flex-1 text-[13px] text-fg-1">{a.value}</span>
            <span className={cn('text-[12px]', roleOf(a.role).tint)}>{roleOf(a.role).label}</span>
            <SvgIcon name="check" size={14} className="text-green-500" />
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── 4. Bulk plakken (lijst importeren) ───────────────────────────────────────
function BulkPaste() {
  const [text, setText] = React.useState('')
  const [role, setRole] = React.useState<RoleId>('lid')
  const [imported, setImported] = React.useState(false)

  const tokens = text.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
  const valid = Array.from(new Set(tokens.filter(isEmail)))
  const invalid = tokens.filter((t) => !isEmail(t))

  return (
    <Panel
      title="Plak een hele lijst"
      blurb="Een compleet team in één keer aan boord. Plak e-mailadressen uit een sheet of mail; we filteren dubbele en foute er live uit."
    >
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setImported(false) }}
          rows={5}
          placeholder={'lisa@klant.nl, mark@klant.nl\nnoa@bureau.nl …'}
          className="w-full resize-none rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5 font-[Inter] text-[13px] text-fg-1 outline-none placeholder:text-fg-3 focus:border-border-strong"
        />

        {tokens.length > 0 && (
          <div className="mt-3 flex items-center gap-3 text-[12px]">
            <span className="flex items-center gap-1 text-green-500"><SvgIcon name="badge-check" size={13} />{valid.length} geldig</span>
            {invalid.length > 0 && <span className="flex items-center gap-1 text-fg-3"><SvgIcon name="triangle-exclamation" size={13} />{invalid.length} overgeslagen</span>}
          </div>
        )}

        {valid.length > 0 && (
          <div className="mt-3 max-h-40 space-y-1 overflow-auto rounded-lg border border-border-subtle bg-bg-1 p-2">
            {valid.map((em) => (
              <div key={em} className="flex items-center gap-2 px-1 py-0.5 text-[13px] text-fg-1">
                <Avatar name={em[0]} size={20} />
                <span>{em}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-medium text-fg-2">Rol voor de hele lijst</p>
          <RolePills value={role} onChange={setRole} />
        </div>

        <Button className="mt-5 w-full" disabled={!valid.length || imported} onClick={() => setImported(true)}>
          <SvgIcon name={imported ? 'check' : 'upload'} size={14} />
          {imported ? `${valid.length} gebruikers geïmporteerd` : valid.length ? `Importeer ${valid.length} gebruikers` : 'Plak adressen om te starten'}
        </Button>
      </div>
    </Panel>
  )
}

// ── 5. Teamkaarten (visueel, inline kaart) ───────────────────────────────────
function TeamCards() {
  const [team, setTeam] = React.useState<Member[]>(TEAM)
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<RoleId>('lid')

  const save = () => {
    if (!name.trim()) return
    setTeam((t) => [...t, { id: 'n' + t.length, name: name.trim(), email: email.trim() || '—', role }])
    setName(''); setEmail(''); setRole('lid'); setAdding(false)
  }

  return (
    <Panel
      title="Visueel team"
      blurb="Zie je team als kaarten. De lege kaart klapt ter plekke open tot een mini-formulier — geen aparte pagina of dialog."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {team.map((m) => (
          <div key={m.id} className="flex flex-col items-center gap-2 rounded-xl border border-border-subtle bg-bg-2 p-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <Avatar name={m.name} size={44} />
            <div>
              <p className="text-[13px] font-medium text-fg-1">{m.name}</p>
              <p className="text-[11px] text-fg-3">{m.email}</p>
            </div>
            <span className={cn('text-[11px]', roleOf(m.role).tint)}>{roleOf(m.role).label}</span>
          </div>
        ))}

        <div
          className={cn(
            'rounded-xl border border-dashed transition-all',
            EASE,
            adding ? 'col-span-2 border-border-strong bg-bg-2 p-4 sm:col-span-3' : 'border-border-subtle',
          )}
        >
          {adding ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={name || '?'} size={44} />
                <div className="flex-1 space-y-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Volledige naam" autoFocus className="h-8" />
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e-mail (optioneel)" className="h-8" />
                </div>
              </div>
              <RolePills value={role} onChange={setRole} />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={save} disabled={!name.trim()}>Toevoegen</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuleer</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="flex h-full min-h-[128px] w-full flex-col items-center justify-center gap-2 text-fg-3 transition-colors hover:text-fg-1">
              <span className="grid size-11 place-content-center rounded-full border border-dashed border-current">
                <SvgIcon name="plus" size={18} />
              </span>
              <span className="text-[12px] font-medium">Nieuw teamlid</span>
            </button>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ── Pagina ───────────────────────────────────────────────────────────────────
type Idea = 'link' | 'email' | 'spotlight' | 'bulk' | 'cards'
const IDEAS: { value: Idea; label: string; icon: string }[] = [
  { value: 'link', label: 'Link', icon: 'link' },
  { value: 'email', label: 'E-mail', icon: 'user-plus' },
  { value: 'spotlight', label: 'Spotlight', icon: 'magnifying-glass' },
  { value: 'bulk', label: 'Bulk', icon: 'upload' },
  { value: 'cards', label: 'Kaarten', icon: 'users' },
]

export default function GebruikersPrototypePage() {
  const [idea, setIdea] = React.useState<Idea>('link')
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-3">
        <div>
          <h1 className="text-[14px] font-medium text-fg-1">Gebruikers toevoegen — prototypes</h1>
          <p className="text-[12px] text-fg-3">5 verschillende paradigma's. Kies een winnaar; die verhuist naar productie.</p>
        </div>
        <SegmentedControl value={idea} onChange={(v) => setIdea(v as Idea)} options={IDEAS} />
      </header>
      <div className="flex-1 overflow-auto px-6 py-10">
        {idea === 'link' && <InviteLink />}
        {idea === 'email' && <EmailInvite />}
        {idea === 'spotlight' && <Spotlight />}
        {idea === 'bulk' && <BulkPaste />}
        {idea === 'cards' && <TeamCards />}
      </div>
    </div>
  )
}
