'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURE_GROUPS,
  FEATURES,
  FeatureIcon,
  LevelBadge,
  RolePill,
  USERS,
  VariantShell,
  effectivePerms,
  featureById,
  roleById,
  type FeatureGroup,
  type PermMap,
  type User,
} from '../shared'

// Variant "Kopieer van collega": kies een bestaand teamlid, bekijk hun effectieve
// rechten, en nodig iemand met exact dezelfde rechten per e-mail uit. Mock: versturen
// met korte timeout → bevestiging. State is volledig lokaal (useState).

type Phase = 'kiezen' | 'verzenden' | 'klaar'

// Bron-collega's: actieve gebruikers die je als rechten-sjabloon kunt kopiëren.
const SOURCES: User[] = USERS.filter((u) => u.status !== 'uitgenodigd')

function CollegaRow({
  user,
  active,
  onClick,
}: {
  user: User
  active: boolean
  onClick: () => void
}) {
  const role = roleById(user.roleId)
  const hasOverrides = !!user.overrides && Object.keys(user.overrides).length > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        EASE,
        'duration-200',
        active
          ? 'border-border-strong bg-bg-3'
          : 'border-border-subtle bg-bg-2 hover:border-border-strong hover:bg-bg-3',
      )}
    >
      <Avatar name={user.name} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-fg-1">{user.name}</p>
        <p className="truncate text-[12px] text-fg-3">{user.email}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {hasOverrides && (
          <span
            title="Heeft persoonlijke uitzonderingen bovenop de rol"
            className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[11px] text-orange-500"
          >
            <SvgIcon name="bolt" size={11} />
            maatwerk
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]',
            role.bg,
            role.tint,
          )}
        >
          <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
          {role.name}
        </span>
      </div>
      <SvgIcon
        name={active ? 'circle-check' : 'circle'}
        size={18}
        className={cn(active ? 'text-green-500' : 'text-fg-3')}
      />
    </button>
  )
}

// Compacte samenvatting van het rechten-profiel: telt features per niveau.
function PermSummary({ perms }: { perms: PermMap }) {
  const counts = { beheer: 0, bewerk: 0, bekijk: 0, geen: 0 }
  for (const f of FEATURES) {
    const l = perms[f.id]
    if (l === 3) counts.beheer++
    else if (l === 2) counts.bewerk++
    else if (l === 1) counts.bekijk++
    else counts.geen++
  }
  const chips: { n: number; label: string; tint: string; bg: string }[] = [
    { n: counts.beheer, label: 'beheren', tint: 'text-green-500', bg: 'bg-green-500/15' },
    { n: counts.bewerk, label: 'bewerken', tint: 'text-purple-500', bg: 'bg-purple-500/15' },
    { n: counts.bekijk, label: 'bekijken', tint: 'text-blue-500', bg: 'bg-blue-500/15' },
    { n: counts.geen, label: 'geen', tint: 'text-fg-3', bg: 'bg-bg-3' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips
        .filter((c) => c.n > 0)
        .map((c) => (
          <span
            key={c.label}
            className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', c.bg, c.tint)}
          >
            <span className="font-medium">{c.n}</span>
            {c.label}
          </span>
        ))}
    </div>
  )
}

// Preview van de effectieve rechten per feature, gegroepeerd.
function PermPreview({ perms }: { perms: PermMap }) {
  return (
    <div className="space-y-3">
      {FEATURE_GROUPS.map((group: FeatureGroup) => {
        const feats = FEATURES.filter((f) => f.group === group)
        return (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">{group}</p>
            <div className="overflow-hidden rounded-lg border border-border-subtle">
              {feats.map((f, i) => (
                <div
                  key={f.id}
                  className={cn(
                    'flex items-center gap-2.5 bg-bg-2 px-3 py-2',
                    i < feats.length - 1 && 'border-b border-border-subtle',
                  )}
                >
                  <FeatureIcon id={f.id} size={15} className="text-fg-3" />
                  <span className="flex-1 text-[13px] text-fg-1">{f.label}</span>
                  <LevelBadge level={perms[f.id]} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Variant() {
  const [sourceId, setSourceId] = React.useState<string | null>(SOURCES[1]?.id ?? null)
  const [email, setEmail] = React.useState('')
  const [phase, setPhase] = React.useState<Phase>('kiezen')

  const source = sourceId ? SOURCES.find((u) => u.id === sourceId) ?? null : null
  const perms = source ? effectivePerms(source) : null
  const role = source ? roleById(source.roleId) : null

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSend = !!source && emailValid && phase === 'kiezen'

  const send = () => {
    if (!canSend) return
    setPhase('verzenden')
    // Mock: korte timeout → bevestiging.
    window.setTimeout(() => setPhase('klaar'), 900)
  }

  const reset = () => {
    setEmail('')
    setPhase('kiezen')
  }

  // ── Bevestiging ────────────────────────────────────────────────────────────
  if (phase === 'klaar' && source) {
    return (
      <VariantShell title="Kopieer van collega" blurb="Geef iemand dezelfde rechten als een teamlid.">
        <div className="rounded-xl border border-border-subtle bg-bg-2 p-6 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-500/15">
            <SvgIcon name="circle-check" size={26} className="text-green-500" />
          </span>
          <h4 className="text-[15px] font-medium text-fg-1">Uitnodiging verstuurd</h4>
          <p className="mt-1 text-[13px] text-fg-3">
            <span className="text-fg-1">{email.trim()}</span> krijgt dezelfde rechten als{' '}
            <span className="text-fg-1">{source.name}</span>.
          </p>

          <div className="mx-auto mt-5 flex max-w-sm items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5 text-left">
            <Avatar name={source.name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-fg-3">Gekopieerd profiel</p>
              <p className="truncate text-[13px] text-fg-1">{source.name}</p>
            </div>
            <SvgIcon name="corner-down-right" size={16} className="text-fg-3" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-fg-3">Uitgenodigd</p>
              <p className="truncate text-[13px] text-fg-1">{email.trim()}</p>
            </div>
          </div>

          {perms && (
            <div className="mx-auto mt-4 flex max-w-sm justify-center">
              <PermSummary perms={perms} />
            </div>
          )}

          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <SvgIcon name="user-plus" size={14} /> Nog iemand uitnodigen
            </Button>
          </div>
        </div>
      </VariantShell>
    )
  }

  // ── Kiezen + verzenden ───────────────────────────────────────────────────────
  return (
    <VariantShell title="Kopieer van collega" blurb="Geef iemand dezelfde rechten als een teamlid.">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Linkerkolom: collega kiezen + e-mail + versturen */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border-subtle bg-bg-1 p-4">
            <div className="mb-3 flex items-center gap-2">
              <SvgIcon name="users" size={15} className="text-fg-3" />
              <h4 className="text-[13px] font-medium text-fg-1">Geef dezelfde rechten als …</h4>
            </div>
            <div className="space-y-2">
              {SOURCES.map((u) => (
                <CollegaRow
                  key={u.id}
                  user={u}
                  active={sourceId === u.id}
                  onClick={() => setSourceId(u.id)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-bg-1 p-4">
            <div className="mb-3 flex items-center gap-2">
              <SvgIcon name="user-plus-1" size={15} className="text-fg-3" />
              <h4 className="text-[13px] font-medium text-fg-1">Wie nodig je uit?</h4>
            </div>
            <label className="mb-1.5 block text-[12px] text-fg-3" htmlFor="invite-email-v6">
              E-mailadres
            </label>
            <Input
              id="invite-email-v6"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="naam@bedrijf.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              disabled={phase === 'verzenden'}
              className="h-9 text-[13px]"
            />
            {email.length > 0 && !emailValid && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-orange-500">
                <SvgIcon name="triangle-exclamation" size={11} />
                Vul een geldig e-mailadres in.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
              <Button size="sm" onClick={send} disabled={!canSend}>
                {phase === 'verzenden' ? (
                  <>
                    <SvgIcon name="circle-notch" size={14} className="animate-spin" /> Versturen…
                  </>
                ) : (
                  <>
                    <SvgIcon name="user-plus" size={14} /> Verstuur uitnodiging
                  </>
                )}
              </Button>
              {source && (
                <span className="text-[12px] text-fg-3">
                  kopieert de rechten van <span className="text-fg-2">{source.name}</span>
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Rechterkolom: live preview van de te kopiëren rechten */}
        <aside className="rounded-xl border border-border-subtle bg-bg-1 p-4">
          {source && perms && role ? (
            <>
              <div className="flex items-center gap-2.5 border-b border-border-subtle pb-3">
                <Avatar name={source.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-fg-1">{source.name}</p>
                  <div className="mt-0.5">
                    <RolePill roleId={source.roleId} active />
                  </div>
                </div>
              </div>

              <div className="py-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                  Profiel-samenvatting
                </p>
                <PermSummary perms={perms} />
              </div>

              <div className="border-t border-border-subtle pt-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                  Effectieve rechten
                </p>
                <PermPreview perms={perms} />
              </div>

              {source.overrides && Object.keys(source.overrides).length > 0 && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-2 text-[11px] text-orange-500">
                  <SvgIcon name="bolt" size={12} className="mt-px shrink-0" />
                  <span>
                    Inclusief persoonlijk maatwerk op{' '}
                    {Object.keys(source.overrides)
                      .map((f) => featureById(f as never).label)
                      .join(', ')}
                    .
                  </span>
                </p>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
              <SvgIcon name="users" size={22} className="mb-2 text-fg-3" />
              <p className="text-[13px] text-fg-2">Kies een collega</p>
              <p className="mt-0.5 text-[12px] text-fg-3">
                Dan zie je hier hun rechten als voorbeeld.
              </p>
            </div>
          )}
        </aside>
      </div>
    </VariantShell>
  )
}
