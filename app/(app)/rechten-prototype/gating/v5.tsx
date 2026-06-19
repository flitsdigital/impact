'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  VariantShell,
  FeatureIcon,
  featureById,
  ACTIONS,
  actionsForLevel,
  levelMeta,
  LEVELS,
  type Level,
  type ActionId,
} from '../shared'

// ponytail: variant "Inline disabled + tooltip". Granulaire per-actie gating op één
// feature-pagina (Facturatie). Elke actie is een knop; mag-ie niet bij het huidige
// niveau, dan disabled + tooltip "Vereist <niveau>-recht". Niveau-switcher = live.

const FEATURE = featureById('facturatie')

// Laagste niveau waarop een actie beschikbaar wordt (0..3). 4 = nooit toegestaan.
function requiredLevel(action: ActionId): Level | 4 {
  for (const l of [1, 2, 3] as Level[]) if (actionsForLevel(l).includes(action)) return l
  return 4
}

// Korte uitleg per actie op de Facturatie-pagina.
const ACTION_HINT: Record<ActionId, string> = {
  view: 'Open en lees facturen in.',
  create: 'Maak een nieuwe factuur aan.',
  edit: 'Pas bedragen, regels en status aan.',
  delete: 'Verwijder een factuur definitief.',
  export: 'Download als PDF of CSV.',
}

// Mock-facturen voor de pagina-body.
const INVOICES = [
  { nr: 'F-2026-041', klant: 'Bouwbedrijf Jansen', bedrag: '€ 4.250,00', status: 'Betaald', tint: 'text-green-500', bg: 'bg-green-500/15' },
  { nr: 'F-2026-040', klant: 'De Vries Interieur', bedrag: '€ 1.880,00', status: 'Openstaand', tint: 'text-orange-500', bg: 'bg-orange-500/15' },
  { nr: 'F-2026-039', klant: 'Studio Noord', bedrag: '€ 920,00', status: 'Concept', tint: 'text-fg-3', bg: 'bg-bg-3' },
  { nr: 'F-2026-038', klant: 'Peters Advies', bedrag: '€ 3.140,00', status: 'Verlopen', tint: 'text-red-500', bg: 'bg-red-500/15' },
]

// Knop met disabled-state + tooltip op hover/focus (geen portal, veilig in overlays).
function ActionControl({
  action,
  level,
  onRun,
}: {
  action: (typeof ACTIONS)[number]
  level: Level
  onRun: (action: (typeof ACTIONS)[number]) => void
}) {
  const [hover, setHover] = React.useState(false)
  const allowed = actionsForLevel(level).includes(action.id)
  const req = requiredLevel(action.id)
  const reqMeta = req === 4 ? null : levelMeta(req)
  const danger = action.id === 'delete'

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <button
        type="button"
        aria-disabled={!allowed}
        tabIndex={0}
        onClick={() => {
          if (allowed) onRun(action)
        }}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
          EASE,
          allowed
            ? cn(
                'cursor-pointer border-border-subtle bg-bg-2 hover:border-border-strong hover:bg-bg-3',
                danger && 'hover:border-red-500/40',
              )
            : 'cursor-not-allowed border-border-subtle bg-bg-1 opacity-60',
        )}
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md',
            allowed ? (danger ? 'bg-red-500/15 text-red-500' : 'bg-secondary text-fg-1') : 'bg-bg-3 text-fg-3',
          )}
        >
          <SvgIcon name={allowed ? action.icon : 'triangle-exclamation'} size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[13px]', allowed ? (danger ? 'text-red-500' : 'text-fg-1') : 'text-fg-3')}>
            {action.label}
          </span>
          <span className="block truncate text-[11px] text-fg-3">{ACTION_HINT[action.id]}</span>
        </span>
        {allowed ? (
          <SvgIcon name="check" size={14} className="shrink-0 text-green-500" />
        ) : (
          <SvgIcon name="x" size={14} className="shrink-0 text-fg-3" />
        )}
      </button>

      {/* Tooltip: alleen bij niet-toegestane acties */}
      {!allowed && hover && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute -top-1 left-1/2 z-30 w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border-strong bg-bg-0 p-2.5 shadow-lg',
          )}
        >
          <div className="flex items-center gap-1.5">
            <SvgIcon name="triangle-exclamation" size={12} className="text-orange-500" />
            <span className="text-[12px] font-medium text-fg-1">
              {reqMeta ? `Vereist ${reqMeta.label}-recht` : 'Niet beschikbaar'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-fg-3">
            {reqMeta
              ? `“${action.label}” op Facturatie kan vanaf niveau ${reqMeta.short}.`
              : `“${action.label}” is in geen enkel niveau toegestaan.`}
          </p>
          {reqMeta && (
            <div className="mt-2 flex items-center gap-1.5 border-t border-border-subtle pt-2">
              <SvgIcon name={reqMeta.icon} size={12} className={reqMeta.tint} />
              <span className={cn('text-[11px]', reqMeta.tint)}>Minimaal: {reqMeta.label}</span>
            </div>
          )}
          {/* pijltje */}
          <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-border-strong bg-bg-0" />
        </div>
      )}
    </div>
  )
}

export default function Variant() {
  const [level, setLevel] = React.useState<Level>(1)
  const [lastRun, setLastRun] = React.useState<(typeof ACTIONS)[number] | null>(null)
  const meta = levelMeta(level)
  const allowedIds = actionsForLevel(level)
  const allowedCount = allowedIds.length
  const blocked = ACTIONS.filter((a) => !allowedIds.includes(a.id))

  // Niveau wisselen wist de laatst-uitgevoerde-melding (anders blijft een actie
  // "bevestigd" terwijl ze op het nieuwe niveau misschien niet meer mag).
  const changeLevel = (l: Level) => {
    setLevel(l)
    setLastRun(null)
  }

  return (
    <VariantShell title="Inline disabled + tooltip" blurb="Per-actie vergrendeld met uitleg-tooltip.">
      {/* Bekijk-als switcher */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <SvgIcon name="user" size={14} className="text-fg-3" />
          <span className="text-[12px] text-fg-2">Bekijk als niveau</span>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-bg-0 p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => changeLevel(l.value)}
              title={`${l.label} — ${l.desc}`}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
                EASE,
                level === l.value ? cn(l.bg, l.tint) : 'text-fg-3 hover:text-fg-1',
              )}
            >
              <SvgIcon name={l.icon} size={12} />
              {l.short}
            </button>
          ))}
        </div>
      </div>

      {/* Feature-pagina kop */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-fg-1">
              <FeatureIcon id={FEATURE.id} size={18} />
            </span>
            <div>
              <h4 className="text-[14px] font-medium text-fg-1">{FEATURE.label}</h4>
              <p className="text-[12px] text-fg-3">{FEATURE.desc}</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]', meta.bg, meta.tint)}>
            <SvgIcon name={meta.icon} size={11} />
            Jouw niveau: {meta.label}
          </span>
        </div>

        {/* Geen toegang → de hele pagina is dicht */}
        {level === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-bg-3 text-fg-3">
              <SvgIcon name="triangle-exclamation" size={22} />
            </span>
            <p className="mt-3 text-[14px] font-medium text-fg-1">Geen toegang tot Facturatie</p>
            <p className="mt-1 max-w-xs text-[12px] text-fg-3">
              Op niveau “Geen” is deze module verborgen. Vraag minimaal Bekijken-recht aan om facturen in te zien.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => changeLevel(1)}>
              <SvgIcon name="magnifying-glass" size={13} /> Bekijk met Bekijken-recht
            </Button>
          </div>
        ) : (
          <>
            {/* Acties-balk: granulaire per-actie controls */}
            <div className="border-b border-border-subtle px-4 py-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[12px] font-medium text-fg-2">Acties op deze pagina</span>
                <span className="text-[11px] text-fg-3">
                  {allowedCount} van {ACTIONS.length} beschikbaar
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ACTIONS.map((a) => (
                  <ActionControl key={a.id} action={a} level={level} onRun={setLastRun} />
                ))}
              </div>
              {lastRun && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-green-500/40 bg-green-500/15 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[12px] text-fg-1">
                    <SvgIcon name="circle-check" size={13} className="text-green-500" />
                    Actie uitgevoerd: <span className="font-medium">{lastRun.label}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setLastRun(null)}
                    className={cn('flex size-6 items-center justify-center rounded-md text-fg-3 transition-colors hover:text-fg-1', EASE)}
                    title="Melding sluiten"
                  >
                    <SvgIcon name="x" size={12} />
                  </button>
                </div>
              )}
              {blocked.length > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-3">
                  <SvgIcon name="triangle-exclamation" size={11} className="text-orange-500" />
                  {blocked.length} {blocked.length === 1 ? 'actie is' : 'acties zijn'} vergrendeld — beweeg erover voor de
                  reden.
                </p>
              )}
            </div>

            {/* Pagina-body: factuurlijst (read-only voorbeeld) */}
            <div className="px-4 py-3">
              <div className="overflow-hidden rounded-lg border border-border-subtle">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-2 text-[11px] text-fg-3">
                      <th className="px-3 py-2 font-medium">Nummer</th>
                      <th className="px-3 py-2 font-medium">Klant</th>
                      <th className="px-3 py-2 text-right font-medium">Bedrag</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {INVOICES.map((inv) => {
                      const canEdit = allowedIds.includes('edit')
                      const canDelete = allowedIds.includes('delete')
                      return (
                        <tr key={inv.nr} className="border-b border-border-subtle last:border-0">
                          <td className="px-3 py-2.5 text-[12px] text-fg-1">{inv.nr}</td>
                          <td className="px-3 py-2.5 text-[12px] text-fg-2">{inv.klant}</td>
                          <td className="px-3 py-2.5 text-right text-[12px] tabular-nums text-fg-1">{inv.bedrag}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px]', inv.bg, inv.tint)}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                aria-disabled={!canEdit}
                                title={canEdit ? 'Bewerken' : 'Vereist Bewerken-recht'}
                                onClick={() => {
                                  if (canEdit) setLastRun(ACTIONS.find((a) => a.id === 'edit')!)
                                }}
                                className={cn(
                                  'flex size-7 items-center justify-center rounded-md transition-colors',
                                  EASE,
                                  canEdit ? 'text-fg-2 hover:bg-bg-3 hover:text-fg-1' : 'cursor-not-allowed text-fg-3 opacity-50',
                                )}
                              >
                                <SvgIcon name="pencil" size={13} />
                              </button>
                              <button
                                type="button"
                                aria-disabled={!canDelete}
                                title={canDelete ? 'Verwijderen' : 'Vereist Beheren-recht'}
                                onClick={() => {
                                  if (canDelete) setLastRun(ACTIONS.find((a) => a.id === 'delete')!)
                                }}
                                className={cn(
                                  'flex size-7 items-center justify-center rounded-md transition-colors',
                                  EASE,
                                  canDelete ? 'text-red-500 hover:bg-red-500/15' : 'cursor-not-allowed text-fg-3 opacity-50',
                                )}
                              >
                                <SvgIcon name="trash" size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legenda / toelichting */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5 text-[11px] text-fg-3">
        <span className="flex items-center gap-1.5">
          <SvgIcon name="check" size={12} className="text-green-500" /> Toegestaan op dit niveau
        </span>
        <span className="flex items-center gap-1.5">
          <SvgIcon name="x" size={12} className="text-fg-3" /> Vergrendeld
        </span>
        <span className="flex items-center gap-1.5">
          <SvgIcon name="triangle-exclamation" size={12} className="text-orange-500" /> Hover toont het vereiste niveau
        </span>
      </div>
    </VariantShell>
  )
}
