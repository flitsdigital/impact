'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  LevelSelect,
  LevelBadge,
  VariantShell,
  featureById,
  levelMeta,
  actionsForLevel,
  ACTIONS,
  type Level,
  FeatureIcon,
} from '../shared'

// ponytail: gating-variant "Locked overlay". De feature-pagina (Facturatie) wordt altijd
// gerenderd, maar bij niveau 0 ligt er een geblurde/verduisterde overlay overheen met een
// aanvraag-kaart. Vanaf niveau 1 (Bekijken) verdwijnt de overlay en zie je de pagina scherp.
// De "Bekijk als niveau"-switcher stuurt dit live aan zodat lock/unlock zichtbaar wordt.

const FEATURE = featureById('facturatie')

// ── Mockdata voor de Facturatie-pagina (achterliggende content) ───────────────
const KPIS = [
  { label: 'Openstaand', value: '€ 24.850', icon: 'clock', tint: 'text-orange-500' },
  { label: 'Betaald (mnd)', value: '€ 61.200', icon: 'circle-check', tint: 'text-green-500' },
  { label: 'Verlopen', value: '€ 3.940', icon: 'triangle-exclamation', tint: 'text-red-500' },
]

const INVOICES = [
  { nr: '2026-0142', klant: 'Bakkerij Hertog', bedrag: '€ 1.250', status: 'Betaald', tint: 'text-green-500', bg: 'bg-green-500/15' },
  { nr: '2026-0141', klant: 'Studio Noord', bedrag: '€ 3.480', status: 'Openstaand', tint: 'text-blue-500', bg: 'bg-blue-500/15' },
  { nr: '2026-0140', klant: 'Van Dijk Advies', bedrag: '€ 890', status: 'Verlopen', tint: 'text-red-500', bg: 'bg-red-500/15' },
  { nr: '2026-0139', klant: 'Groen & Co', bedrag: '€ 2.100', status: 'Openstaand', tint: 'text-blue-500', bg: 'bg-blue-500/15' },
  { nr: '2026-0138', klant: 'Hotel Zeezicht', bedrag: '€ 5.600', status: 'Betaald', tint: 'text-green-500', bg: 'bg-green-500/15' },
]

// ── De mock feature-pagina zelf (wordt geblurd bij geen toegang) ──────────────
function FacturatiePagina({ level }: { level: Level }) {
  const allowed = actionsForLevel(level)
  const canEdit = level >= 2
  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Header van de pagina */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={cn('grid size-9 place-items-center rounded-lg', FEATURE.icon ? 'bg-bg-3' : '')}>
            <FeatureIcon id="facturatie" size={18} className="text-fg-2" />
          </span>
          <div>
            <h4 className="text-[15px] font-medium text-fg-1">Facturatie</h4>
            <p className="text-[11px] text-fg-3">Facturen & omzet · juni 2026</p>
          </div>
        </div>
        <Button size="sm" variant="default" disabled={!canEdit}>
          <SvgIcon name="file-plus" size={13} /> Nieuwe factuur
        </Button>
      </div>

      {/* KPI-rij */}
      <div className="grid grid-cols-3 gap-3">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-border-subtle bg-bg-2 p-3">
            <div className="flex items-center gap-1.5 text-fg-3">
              <SvgIcon name={k.icon} size={13} className={k.tint} />
              <span className="text-[11px]">{k.label}</span>
            </div>
            <p className="mt-1.5 text-[18px] font-medium text-fg-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Facturentabel */}
      <div className="overflow-hidden rounded-lg border border-border-subtle">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-1 text-[11px] text-fg-3">
              <th className="px-3 py-2 font-medium">Factuur</th>
              <th className="px-3 py-2 font-medium">Klant</th>
              <th className="px-3 py-2 font-medium">Bedrag</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.nr} className="border-b border-border-subtle text-[12px] last:border-0">
                <td className="px-3 py-2 font-mono text-fg-2">{inv.nr}</td>
                <td className="px-3 py-2 text-fg-1">{inv.klant}</td>
                <td className="px-3 py-2 text-fg-1">{inv.bedrag}</td>
                <td className="px-3 py-2">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px]', inv.bg, inv.tint)}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Beschikbare acties op dit niveau — verandert mee met de switcher */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5">
        <span className="text-[11px] text-fg-3">Jouw acties:</span>
        {ACTIONS.map((a) => {
          const ok = allowed.includes(a.id)
          return (
            <span
              key={a.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]',
                ok ? 'bg-green-500/15 text-green-500' : 'bg-bg-3 text-fg-3 line-through',
              )}
            >
              <SvgIcon name={ok ? a.icon : 'x'} size={11} />
              {a.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── De aanvraag-overlay (verschijnt bij niveau 0) ─────────────────────────────
function LockOverlay({
  requested,
  onRequest,
}: {
  requested: boolean
  onRequest: () => void
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 grid place-items-center bg-bg-0/70 backdrop-blur-md transition-opacity duration-300',
        EASE,
      )}
    >
      <div
        className={cn(
          'mx-4 w-full max-w-sm rounded-xl border border-border-strong bg-bg-2 p-6 text-center shadow-2xl',
          'transition-all duration-300',
          EASE,
        )}
      >
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-orange-500/15">
          <SvgIcon name="triangle-exclamation" size={22} className="text-orange-500" />
        </div>
        <h4 className="mt-3.5 text-[15px] font-medium text-fg-1">Geen toegang tot Facturatie</h4>
        <p className="mx-auto mt-1.5 max-w-[18rem] text-[12px] leading-relaxed text-fg-3">
          Je rol heeft geen recht op deze module. Vraag een beheerder om toegang, of bekijk hieronder
          hoe de pagina eruitziet met een hoger niveau.
        </p>

        {requested ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-500/15 px-3 py-2 text-[12px] text-green-500">
            <SvgIcon name="circle-check" size={14} />
            Aanvraag verstuurd naar beheerder
          </div>
        ) : (
          <Button size="default" variant="default" className="mt-4 w-full" onClick={onRequest}>
            <SvgIcon name="user-plus" size={14} /> Vraag toegang
          </Button>
        )}

        <p className="mt-3 text-[11px] text-fg-3">
          Huidig niveau: <LevelBadge level={0} />
        </p>
      </div>
    </div>
  )
}

export default function Variant() {
  const [level, setLevel] = React.useState<Level>(0)
  const [requested, setRequested] = React.useState(false)
  const locked = level === 0
  const m = levelMeta(level)

  // Een nieuwe aanvraag-status hoort bij niveau 0; bij ophogen resetten we hem stil.
  const handleLevel = (l: Level) => {
    setLevel(l)
    if (l > 0) setRequested(false)
  }

  return (
    <VariantShell
      title="Locked overlay"
      blurb="Pagina zichtbaar maar vergrendeld met aanvraag."
    >
      {/* Switcher: "Bekijk als niveau" — stuurt de lock/unlock live aan */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <SvgIcon name="scrubber" size={14} className="text-fg-3" />
          <span className="text-[12px] text-fg-2">Bekijk als niveau</span>
        </div>
        <div className="flex items-center gap-2">
          <LevelSelect value={level} onChange={handleLevel} showLabels />
        </div>
      </div>

      {/* Status-regel: maakt de huidige behandeling expliciet */}
      <div className="mb-3 flex items-center gap-2 text-[12px]">
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-orange-500">
            <SvgIcon name="triangle-exclamation" size={13} />
            Vergrendeld — overlay actief
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-green-500">
            <SvgIcon name="circle-check" size={13} />
            Ontgrendeld — pagina zichtbaar als {m.label.toLowerCase()}
          </span>
        )}
        {!locked && <LevelBadge level={level} />}
      </div>

      {/* Het venster: feature-pagina met optionele overlay erover */}
      <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
        <div
          className={cn(
            'transition-all duration-300',
            EASE,
            locked && 'pointer-events-none select-none blur-[3px] saturate-50',
          )}
          aria-hidden={locked}
        >
          <FacturatiePagina level={level} />
        </div>

        {locked && <LockOverlay requested={requested} onRequest={() => setRequested(true)} />}
      </div>

      <p className="mt-2.5 text-[11px] text-fg-3">
        Zet het niveau op <span className="text-blue-500">Bekijken</span> of hoger om de overlay te
        laten verdwijnen.
      </p>
    </VariantShell>
  )
}
