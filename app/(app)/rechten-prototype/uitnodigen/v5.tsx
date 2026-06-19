'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FEATURE_GROUPS,
  FeatureIcon,
  LevelSelect,
  LevelBadge,
  RolePill,
  VariantShell,
  roleById,
  levelMeta,
  type FeatureId,
  type Level,
  type PermMap,
  type RoleId,
} from '../shared'

// ponytail: variant 5 — "Inline klap-uit rechten".
// Snel pad: e-mail + rol-pill + Verstuur, op één regel. De rol-perms vullen het verstuurde recht.
// Diep pad: "Pas rechten aan" klapt een compacte per-feature matrix open (LevelSelect per feature),
// vooringevuld vanaf de gekozen rol. Afwijkingen t.o.v. de rol worden geteld + zijn terug te zetten.
// Versturen = korte timeout → bevestiging (mock).

type Phase = 'form' | 'sending' | 'sent'

const ROLE_ORDER: RoleId[] = ['beheerder', 'manager', 'lid', 'lezer']

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export default function Variant() {
  const [email, setEmail] = React.useState('')
  const [roleId, setRoleId] = React.useState<RoleId>('lid')
  const [expanded, setExpanded] = React.useState(false)
  const [phase, setPhase] = React.useState<Phase>('form')

  // Afwijkende niveaus t.o.v. de rol. Leeg = volg de rol exact.
  const [overrides, setOverrides] = React.useState<Partial<PermMap>>({})

  const role = roleById(roleId)
  const rolePerms = role.perms

  // Effectieve permissie-map: rol als basis, met de handmatige afwijkingen erover.
  const effective: PermMap = React.useMemo(
    () => ({ ...rolePerms, ...overrides }),
    [rolePerms, overrides],
  )

  // Een afwijking telt alleen als hij echt verschilt van wat de rol geeft.
  const realOverrides = React.useMemo(
    () =>
      (Object.keys(overrides) as FeatureId[]).filter(
        (f) => overrides[f] !== undefined && overrides[f] !== rolePerms[f],
      ),
    [overrides, rolePerms],
  )
  const overrideCount = realOverrides.length

  const emailValid = isEmail(email)

  // Rol wisselen wist afwijkingen — je begint schoon vanaf de nieuwe rol-basis.
  function pickRole(id: RoleId) {
    setRoleId(id)
    setOverrides({})
  }

  function setFeatureLevel(f: FeatureId, level: Level) {
    setOverrides((prev) => {
      const next = { ...prev }
      if (level === rolePerms[f]) delete next[f]
      else next[f] = level
      return next
    })
  }

  function resetFeature(f: FeatureId) {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[f]
      return next
    })
  }

  function resetAll() {
    setOverrides({})
  }

  function send() {
    if (!emailValid || phase === 'sending') return
    setPhase('sending')
    window.setTimeout(() => setPhase('sent'), 1100)
  }

  function reset() {
    setEmail('')
    setRoleId('lid')
    setOverrides({})
    setExpanded(false)
    setPhase('form')
  }

  // ── Bevestiging ────────────────────────────────────────────────────────────
  if (phase === 'sent') {
    return (
      <VariantShell title="Inline klap-uit rechten" blurb="Snel uitnodigen, rechten desgewenst uitklappen.">
        <div className="rounded-xl border border-border-subtle bg-bg-2 p-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/15">
              <SvgIcon name="check" size={18} className="text-green-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-fg-1">Uitnodiging verstuurd</p>
              <p className="mt-0.5 text-[13px] text-fg-3">
                <span className="text-fg-1">{email.trim()}</span> krijgt een e-mail met een onboarding-link.
              </p>

              <div className="mt-4 space-y-3 rounded-lg border border-border-subtle bg-bg-1 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-3">Rol</span>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]', role.bg, role.tint)}>
                    <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
                    {role.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-3">Aangepaste rechten</span>
                  <span className="text-[12px] text-fg-1">
                    {overrideCount === 0
                      ? 'Geen — volgt de rol'
                      : `${overrideCount} ${overrideCount === 1 ? 'afwijking' : 'afwijkingen'}`}
                  </span>
                </div>
                {overrideCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-border-subtle pt-3">
                    {realOverrides.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-2 px-2 py-1 text-[11px] text-fg-2"
                      >
                        <FeatureIcon id={f} size={12} className="text-fg-3" />
                        {FEATURES.find((x) => x.id === f)!.label}
                        <LevelBadge level={effective[f]} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={reset}>
                  <SvgIcon name="user-plus" size={14} />
                  Nog iemand uitnodigen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </VariantShell>
    )
  }

  // ── Formulier ────────────────────────────────────────────────────────────────
  return (
    <VariantShell title="Inline klap-uit rechten" blurb="Snel uitnodigen, rechten desgewenst uitklappen.">
      <div className="rounded-xl border border-border-subtle bg-bg-2 p-4">
        {/* Snelle inline regel: e-mail + Verstuur */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SvgIcon
              name="user-plus"
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send()
              }}
              placeholder="naam@bedrijf.nl"
              className="pl-9"
              autoFocus
            />
          </div>
          <Button
            onClick={send}
            disabled={!emailValid || phase === 'sending'}
            className="sm:w-auto"
          >
            {phase === 'sending' ? (
              <>
                <SvgIcon name="circle-notch" size={15} className="animate-spin" />
                Versturen…
              </>
            ) : (
              <>
                <SvgIcon name="user-plus-1" size={15} />
                Verstuur
              </>
            )}
          </Button>
        </div>

        {/* Rol-pills — bepalen de basis-rechten */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-fg-3">Rol</span>
          {ROLE_ORDER.map((id) => (
            <RolePill key={id} roleId={id} active={roleId === id} onClick={() => pickRole(id)} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-fg-3">{role.desc}.</p>

        {/* Klap-uit link */}
        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-md text-[12px] text-fg-2 transition-colors hover:text-fg-1',
            EASE,
          )}
        >
          <SvgIcon
            name="chevron-down"
            size={14}
            className={cn('transition-transform duration-200', EASE, expanded && 'rotate-180')}
          />
          Pas rechten aan voor deze persoon
          {overrideCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] text-orange-500">
              {overrideCount} {overrideCount === 1 ? 'afwijking' : 'afwijkingen'}
            </span>
          )}
        </button>

        {/* Uitklapbare per-feature matrix */}
        <div
          className={cn(
            'grid transition-all duration-300',
            EASE,
            expanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="rounded-lg border border-border-subtle bg-bg-1 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] text-fg-3">
                  Begint bij <span className={role.tint}>{role.name}</span>. Wijk per module af waar nodig.
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={overrideCount === 0}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
                    EASE,
                    overrideCount === 0
                      ? 'cursor-not-allowed text-fg-3 opacity-50'
                      : 'text-fg-2 hover:bg-bg-3 hover:text-fg-1',
                  )}
                >
                  <SvgIcon name="refresh" size={12} />
                  Terug naar rol
                </button>
              </div>

              <div className="space-y-3">
                {FEATURE_GROUPS.map((group) => {
                  const items = FEATURES.filter((f) => f.group === group)
                  return (
                    <div key={group}>
                      <p className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                        {group}
                      </p>
                      <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-2">
                        {items.map((f, i) => {
                          const lvl = effective[f.id]
                          const changed = overrides[f.id] !== undefined && overrides[f.id] !== rolePerms[f.id]
                          return (
                            <div
                              key={f.id}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2',
                                i !== items.length - 1 && 'border-b border-border-subtle',
                                changed && 'bg-orange-500/[0.06]',
                              )}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <span
                                  className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                                    levelMeta(lvl).bg,
                                  )}
                                >
                                  <FeatureIcon id={f.id} size={14} className={levelMeta(lvl).tint} />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-[13px] text-fg-1">{f.label}</span>
                                    {changed && (
                                      <span className="inline-flex size-1.5 shrink-0 rounded-full bg-orange-500" title="Afwijkend van de rol" />
                                    )}
                                  </div>
                                  <p className="truncate text-[11px] text-fg-3">
                                    {changed ? (
                                      <span className="text-orange-500">
                                        Was {levelMeta(rolePerms[f.id]).short.toLowerCase()}
                                      </span>
                                    ) : (
                                      f.desc
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <LevelSelect value={lvl} onChange={(l) => setFeatureLevel(f.id, l)} />
                                <button
                                  type="button"
                                  onClick={() => resetFeature(f.id)}
                                  disabled={!changed}
                                  title="Terug naar rol-niveau"
                                  className={cn(
                                    'flex size-7 items-center justify-center rounded-md transition-colors',
                                    EASE,
                                    changed
                                      ? 'text-fg-3 hover:bg-bg-3 hover:text-fg-1'
                                      : 'pointer-events-none opacity-0',
                                  )}
                                >
                                  <SvgIcon name="arrow-left" size={13} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Voettekst-samenvatting */}
        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
          <p className="text-[11px] text-fg-3">
            {overrideCount === 0 ? (
              <>Krijgt exact de rechten van <span className="text-fg-2">{role.name}</span>.</>
            ) : (
              <>
                Rechten van <span className="text-fg-2">{role.name}</span> met{' '}
                <span className="text-orange-500">{overrideCount} {overrideCount === 1 ? 'afwijking' : 'afwijkingen'}</span>.
              </>
            )}
          </p>
          {!emailValid && email.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-red-500">
              <SvgIcon name="triangle-exclamation" size={12} />
              Ongeldig e-mailadres
            </span>
          )}
        </div>
      </div>
    </VariantShell>
  )
}
