'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FeatureIcon,
  LevelBadge,
  ROLES,
  VariantShell,
  effectivePerms,
  levelMeta,
  roleById,
  type FeatureId,
  type Level,
  type Role,
} from '../shared'

// Variant v3 — "Rol-template kaarten": keuze-eerst. Eerst een rol-sjabloon kiezen via
// grote selecteerbare kaarten, daarna pas het e-mailadres + versturen (mock met timeout).

type Phase = 'kiezen' | 'verstuurd'

// Aantal features waar een rol daadwerkelijk toegang toe geeft (level > 0).
function accessibleFeatures(role: Role): FeatureId[] {
  return FEATURES.filter((f) => role.perms[f.id] > 0).map((f) => f.id)
}

// De 'opvallendste' niveaus van een rol, als voorproefje — hoogste eerst, ontdubbeld.
function previewLevels(role: Role): Level[] {
  const present = new Set<Level>()
  for (const f of FEATURES) {
    const lvl = role.perms[f.id]
    if (lvl > 0) present.add(lvl)
  }
  return ([3, 2, 1] as Level[]).filter((l) => present.has(l))
}

function emailValid(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export default function Variant() {
  const [selected, setSelected] = React.useState<string>(ROLES[2]?.id ?? ROLES[0].id)
  const [email, setEmail] = React.useState('')
  const [phase, setPhase] = React.useState<Phase>('kiezen')
  const [sending, setSending] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const role = roleById(selected)
  const valid = emailValid(email)
  const canSend = valid && !sending

  function send() {
    if (!canSend) return
    setSending(true)
    timer.current = setTimeout(() => {
      setSending(false)
      setPhase('verstuurd')
    }, 1100)
  }

  function reset() {
    setEmail('')
    setPhase('kiezen')
  }

  // ── Bevestiging ────────────────────────────────────────────────────────────
  if (phase === 'verstuurd') {
    const perms = effectivePerms({ id: 'preview', name: '', email, roleId: selected, status: 'uitgenodigd', lastActive: '—' })
    const granted = FEATURES.filter((f) => perms[f.id] > 0)
    return (
      <VariantShell title="Rol-template kaarten" blurb="Kies eerst een rol-sjabloon, dan het adres.">
        <div className="rounded-xl border border-border-subtle bg-bg-2 p-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-green-500/15 text-green-500">
              <SvgIcon name="circle-check" size={26} />
            </span>
            <h4 className="mt-3 text-[15px] font-medium text-fg-1">Uitnodiging verstuurd</h4>
            <p className="mt-1 max-w-sm text-[13px] text-fg-3">
              We hebben een uitnodiging gemaild naar <span className="text-fg-1">{email.trim()}</span> met de
              rechten van het sjabloon <span className={role.tint}>{role.name}</span>.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 p-3">
            <Avatar name={email.trim()} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-fg-1">{email.trim()}</p>
              <p className="text-[12px] text-fg-3">Wacht op acceptatie</p>
            </div>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]', role.bg, role.tint)}>
              <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
              {role.name}
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-border-subtle bg-bg-1 p-3">
            <p className="mb-2 text-[12px] text-fg-3">Krijgt toegang tot {granted.length} onderdelen</p>
            <div className="flex flex-wrap gap-2">
              {granted.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2 py-1 text-[12px] text-fg-2">
                  <FeatureIcon id={f.id} size={13} className={levelMeta(perms[f.id]).tint} />
                  {f.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={reset}>
              <SvgIcon name="user-plus" size={14} /> Nog iemand uitnodigen
            </Button>
          </div>
        </div>
      </VariantShell>
    )
  }

  // ── Keuze-eerst: rol-kaarten + e-mailveld ────────────────────────────────────
  return (
    <VariantShell title="Rol-template kaarten" blurb="Kies eerst een rol-sjabloon, dan het adres.">
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-5">
        {/* Stap 1 — rol kiezen */}
        <div className="mb-1 flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-fg-1">1</span>
          <h4 className="text-[13px] font-medium text-fg-1">Kies een rol-sjabloon</h4>
        </div>
        <p className="mb-3 pl-7 text-[12px] text-fg-3">Bepaalt in één klik welke onderdelen de nieuwe gebruiker ziet en mag.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ROLES.map((r) => {
            const active = r.id === selected
            const count = accessibleFeatures(r).length
            const levels = previewLevels(r)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                aria-pressed={active}
                className={cn(
                  'group relative flex flex-col rounded-xl border p-4 text-left transition-all',
                  EASE, 'duration-200',
                  active
                    ? 'border-border-strong bg-bg-1 ring-1 ring-border-strong'
                    : 'border-border-subtle bg-bg-1 hover:border-border-strong hover:bg-bg-3',
                )}
              >
                {/* actieve vinkje */}
                <span
                  className={cn(
                    'absolute right-3 top-3 flex size-5 items-center justify-center rounded-full transition-all',
                    EASE, 'duration-200',
                    active ? cn(r.bg, r.tint, 'scale-100 opacity-100') : 'scale-75 opacity-0',
                  )}
                >
                  <SvgIcon name="check" size={13} />
                </span>

                <div className="flex items-center gap-2.5">
                  <span className={cn('flex size-9 items-center justify-center rounded-lg', r.bg, r.tint)}>
                    <SvgIcon name="badge-check" size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium text-fg-1">{r.name}</p>
                      {r.system && (
                        <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[10px] text-fg-3">Systeem</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-[12px] leading-snug text-fg-3">{r.desc}</p>

                <div className="mt-3 flex items-center gap-1.5 text-[12px] text-fg-2">
                  <SvgIcon name="layers" size={13} className="text-fg-3" />
                  Geeft toegang tot <span className="font-medium text-fg-1">{count}</span> onderdelen
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {levels.map((l) => (
                    <LevelBadge key={l} level={l} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Stap 2 — e-mail + versturen */}
        <div className="mt-5 border-t border-border-subtle pt-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[11px] font-medium text-fg-1">2</span>
            <h4 className="text-[13px] font-medium text-fg-1">Naar wie sturen we de uitnodiging?</h4>
          </div>
          <p className="mb-3 pl-7 text-[12px] text-fg-3">
            De uitnodiging gaat uit met de rechten van{' '}
            <span className={role.tint}>{role.name}</span>.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3">
                <SvgIcon name="user-plus" size={15} />
              </span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                placeholder="naam@bedrijf.nl"
                className="h-9 pl-8 text-[13px]"
                disabled={sending}
                autoComplete="off"
              />
            </div>
            <Button
              onClick={send}
              disabled={!canSend}
              size="default"
              className="h-9 shrink-0"
            >
              {sending ? (
                <>
                  <SvgIcon name="circle-notch" size={14} className="animate-spin" />
                  Versturen…
                </>
              ) : (
                <>
                  <SvgIcon name="user-plus-1" size={14} />
                  Verstuur uitnodiging
                </>
              )}
            </Button>
          </div>

          {email.trim().length > 0 && !valid && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-orange-500">
              <SvgIcon name="triangle-exclamation" size={13} />
              Vul een geldig e-mailadres in.
            </p>
          )}
        </div>
      </div>
    </VariantShell>
  )
}
