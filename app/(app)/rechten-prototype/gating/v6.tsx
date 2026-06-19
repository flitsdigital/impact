'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  VariantShell,
  LevelBadge,
  featureById,
  levelMeta,
  actionsForLevel,
  ACTIONS,
  type Level,
  FeatureIcon,
} from '../shared'

// ponytail: gating-variant "Toegang-aanvraag flow". Mini end-to-end levenscyclus van één
// toegangsaanvraag: gebruiker zonder recht (niveau 0) vraagt toegang → status "wacht op Jordi"
// (spinner/clock) → beheerder-paneel (mock) toont de openstaande aanvraag → Goedkeuren zet het
// niveau op Bekijken en ontgrendelt de pagina; Afwijzen laat een afwijzing zien.
// Alles lokale state, geen DB. De twee kanten (aanvrager + beheerder) staan naast elkaar zodat
// de hele cyclus in één scherm zichtbaar is.

const FEATURE = featureById('facturatie')

type Phase = 'geen' | 'aangevraagd' | 'goedgekeurd' | 'afgewezen'

// De aanvrager (huidige "ingelogde" gebruiker zonder recht) + de beheerder die beslist.
const AANVRAGER = { name: 'Mees Peters', email: 'mees@flits.nl' }
const BEHEERDER = { name: 'Jordi Klavers', rol: 'Beheerder' }

// ── Mockdata voor de Facturatie-pagina (zichtbaar zodra goedgekeurd) ──────────
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
]

// ── Stappen-indicator die de levenscyclus expliciet maakt ─────────────────────
const STEPS: { key: Phase | 'beslissing'; label: string; icon: string }[] = [
  { key: 'geen', label: 'Geen toegang', icon: 'x' },
  { key: 'aangevraagd', label: 'Aangevraagd', icon: 'clock' },
  { key: 'beslissing', label: 'Beheerder beslist', icon: 'user-clock' },
  { key: 'goedgekeurd', label: 'Ontgrendeld', icon: 'circle-check' },
]
function stepIndex(phase: Phase): number {
  if (phase === 'geen') return 0
  if (phase === 'aangevraagd') return 1
  if (phase === 'afgewezen') return 2
  return 3 // goedgekeurd
}

function Lifecycle({ phase }: { phase: Phase }) {
  const active = stepIndex(phase)
  const rejected = phase === 'afgewezen'
  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done = i < active
        const isCurrent = i === active
        const tint = rejected && (i === 2 || i === 3)
          ? 'text-red-500'
          : done
            ? 'text-green-500'
            : isCurrent
              ? 'text-blue-500'
              : 'text-fg-3'
        const ring = rejected && (i === 2 || i === 3)
          ? 'border-red-500/40 bg-red-500/10'
          : done
            ? 'border-green-500/40 bg-green-500/10'
            : isCurrent
              ? 'border-blue-500/40 bg-blue-500/10'
              : 'border-border-subtle bg-bg-2'
        const icon = rejected && i === 2 ? 'x' : rejected && i === 3 ? 'triangle-exclamation' : s.icon
        return (
          <li key={s.key} className="flex flex-1 items-center gap-1">
            <div className="flex min-w-0 flex-col items-center gap-1 text-center">
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-200', EASE, ring, tint)}>
                <SvgIcon name={icon} size={12} />
              </span>
              <span className={cn('truncate text-[10px] leading-tight transition-colors', tint)}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn('-mt-4 h-px flex-1 transition-colors duration-200', EASE, i < active && !rejected ? 'bg-green-500/40' : 'bg-border-subtle')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ── De feature-pagina (zichtbaar na goedkeuring) ──────────────────────────────
function FacturatiePagina({ level }: { level: Level }) {
  const allowed = actionsForLevel(level)
  const canEdit = level >= 2
  return (
    <div className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-bg-3">
            <FeatureIcon id="facturatie" size={18} className="text-fg-2" />
          </span>
          <div>
            <h4 className="text-[14px] font-medium text-fg-1">Facturatie</h4>
            <p className="text-[11px] text-fg-3">Facturen &amp; omzet · juni 2026</p>
          </div>
        </div>
        <Button size="sm" variant="default" disabled={!canEdit}>
          <SvgIcon name="file-plus" size={13} /> Nieuwe factuur
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-border-subtle bg-bg-2 p-2.5">
            <div className="flex items-center gap-1.5 text-fg-3">
              <SvgIcon name={k.icon} size={12} className={k.tint} />
              <span className="text-[11px]">{k.label}</span>
            </div>
            <p className="mt-1 text-[16px] font-medium text-fg-1">{k.value}</p>
          </div>
        ))}
      </div>

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

// ── Aanvrager-kant: gesloten poort → aanvragen → wachten → resultaat ──────────
function AanvragerPaneel({
  phase,
  level,
  onRequest,
}: {
  phase: Phase
  level: Level
  onRequest: () => void
}) {
  // Goedgekeurd: toon de échte pagina.
  if (phase === 'goedgekeurd') {
    return (
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
        <div className="flex items-center gap-2 border-b border-green-500/30 bg-green-500/10 px-3 py-2 text-[12px] text-green-500">
          <SvgIcon name="circle-check" size={14} />
          Toegang verleend door {BEHEERDER.name}
          <LevelBadge level={level} />
        </div>
        <FacturatiePagina level={level} />
      </div>
    )
  }

  // Alle andere fases: een "poort" met de juiste boodschap.
  const view = (() => {
    if (phase === 'aangevraagd') {
      return {
        ring: 'bg-blue-500/15',
        icon: 'circle-notch',
        spin: true,
        iconTint: 'text-blue-500',
        title: 'Aanvraag verstuurd',
        body: (
          <>
            We wachten op een reactie van <span className="text-fg-2">{BEHEERDER.name}</span>. Je krijgt
            bericht zodra je aanvraag is beoordeeld.
          </>
        ),
        chip: (
          <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-[12px] text-blue-500">
            <SvgIcon name="circle-notch" size={14} className="animate-spin" />
            Wacht op {BEHEERDER.name}…
          </span>
        ),
      }
    }
    if (phase === 'afgewezen') {
      return {
        ring: 'bg-red-500/15',
        icon: 'x',
        spin: false,
        iconTint: 'text-red-500',
        title: 'Aanvraag afgewezen',
        body: (
          <>
            {BEHEERDER.name} heeft je aanvraag afgewezen. Neem contact op of vraag het opnieuw met een
            toelichting.
          </>
        ),
        chip: (
          <Button size="default" variant="outline" className="mt-4 w-full" onClick={onRequest}>
            <SvgIcon name="refresh" size={14} /> Opnieuw aanvragen
          </Button>
        ),
      }
    }
    // 'geen'
    return {
      ring: 'bg-orange-500/15',
      icon: 'triangle-exclamation',
      spin: false,
      iconTint: 'text-orange-500',
      title: 'Geen toegang tot Facturatie',
      body: (
        <>
          Je rol heeft (nog) geen recht op deze module. Vraag {BEHEERDER.name} om toegang — je hoeft
          niemand te mailen, dat regelen we hier.
        </>
      ),
      chip: (
        <Button size="default" variant="default" className="mt-4 w-full" onClick={onRequest}>
          <SvgIcon name="user-plus" size={14} /> Vraag toegang
        </Button>
      ),
    }
  })()

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
      {/* Vage preview van de pagina als achtergrond, met poort erover */}
      <div className="relative">
        <div className="pointer-events-none select-none blur-[3px] saturate-50 opacity-60" aria-hidden>
          <FacturatiePagina level={1} />
        </div>
        <div className="absolute inset-0 grid place-items-center bg-bg-0/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border-strong bg-bg-2 p-5 text-center shadow-2xl">
            <div className={cn('mx-auto grid size-11 place-items-center rounded-full', view.ring)}>
              <SvgIcon name={view.icon} size={20} className={cn(view.iconTint, view.spin && 'animate-spin')} />
            </div>
            <h4 className="mt-3 text-[14px] font-medium text-fg-1">{view.title}</h4>
            <p className="mx-auto mt-1.5 max-w-[20rem] text-[12px] leading-relaxed text-fg-3">{view.body}</p>
            {view.chip}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Beheerder-kant: ziet de openstaande aanvraag + beslist ────────────────────
function BeheerderPaneel({
  phase,
  onApprove,
  onReject,
}: {
  phase: Phase
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
      {/* Kop van het beheerder-paneel */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-2 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <SvgIcon name="user-clock" size={15} className="text-purple-500" />
          <span className="text-[12px] font-medium text-fg-1">Openstaande aanvragen</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-fg-3">
          <Avatar name={BEHEERDER.name} size={18} /> {BEHEERDER.name}
        </span>
      </div>

      <div className="p-3.5">
        {phase === 'aangevraagd' ? (
          <div className="rounded-lg border border-border-subtle bg-bg-2 p-3.5">
            <div className="flex items-start gap-3">
              <Avatar name={AANVRAGER.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-medium text-fg-1">{AANVRAGER.name}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-500">
                    <SvgIcon name="clock" size={10} /> Nieuw
                  </span>
                </div>
                <p className="truncate text-[12px] text-fg-3">{AANVRAGER.email}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-fg-2">
                  Vraagt toegang tot <span className="inline-flex items-center gap-1 text-fg-1"><FeatureIcon id="facturatie" size={12} className="text-fg-2" />{FEATURE.label}</span>
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-3">
                  Wordt na goedkeuring: <LevelBadge level={1} />
                </p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-2 border-t border-border-subtle pt-3">
              <Button size="sm" variant="default" className="flex-1" onClick={onApprove}>
                <SvgIcon name="check" size={13} /> Goedkeuren
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-red-500" onClick={onReject}>
                <SvgIcon name="x" size={13} /> Afwijzen
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-subtle bg-bg-2/40 px-4 py-8 text-center">
            <SvgIcon
              name={phase === 'goedgekeurd' ? 'circle-check' : phase === 'afgewezen' ? 'x' : 'inbox'}
              size={22}
              className={cn('mx-auto', phase === 'goedgekeurd' ? 'text-green-500' : phase === 'afgewezen' ? 'text-red-500' : 'text-fg-3')}
            />
            <p className="mt-2 text-[12px] text-fg-2">
              {phase === 'goedgekeurd'
                ? `Aanvraag van ${AANVRAGER.name} goedgekeurd`
                : phase === 'afgewezen'
                  ? `Aanvraag van ${AANVRAGER.name} afgewezen`
                  : 'Geen openstaande aanvragen'}
            </p>
            <p className="mt-0.5 text-[11px] text-fg-3">
              {phase === 'geen'
                ? 'Verzoeken verschijnen hier zodra een teamlid toegang vraagt.'
                : 'De aanvrager is op de hoogte gesteld.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Variant() {
  const [phase, setPhase] = React.useState<Phase>('geen')
  // Niveau wordt alleen door goedkeuring opgehoogd naar 1 (Bekijken).
  const level: Level = phase === 'goedgekeurd' ? 1 : 0
  const m = levelMeta(level)

  const reset = () => setPhase('geen')

  return (
    <VariantShell
      title="Toegang-aanvraag flow"
      blurb="Vraag toegang → wacht → beheerder keurt goed."
      wide
    >
      {/* Levenscyclus-indicator + replay */}
      <div className="mb-4 rounded-xl border border-border-subtle bg-bg-1 px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12px] text-fg-2">
            <SvgIcon name="signal-bars" size={13} className="text-fg-3" />
            Levenscyclus van de aanvraag
          </span>
          <button
            type="button"
            onClick={reset}
            disabled={phase === 'geen'}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
              EASE,
              phase === 'geen' ? 'cursor-default text-fg-3 opacity-50' : 'text-fg-2 hover:bg-bg-3 hover:text-fg-1',
            )}
          >
            <SvgIcon name="refresh" size={11} /> Opnieuw afspelen
          </button>
        </div>
        <Lifecycle phase={phase} />
      </div>

      {/* Twee kanten naast elkaar: aanvrager + beheerder */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Aanvrager */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Avatar name={AANVRAGER.name} size={20} />
            <span className="text-[12px] text-fg-2">Jij — <span className="text-fg-1">{AANVRAGER.name}</span></span>
            <span className="ml-auto">
              {level > 0
                ? <LevelBadge level={level} />
                : <span className="inline-flex items-center gap-1 rounded-full bg-bg-3 px-2 py-0.5 text-[11px] text-fg-3"><SvgIcon name="x" size={11} /> Geen</span>}
            </span>
          </div>
          <AanvragerPaneel phase={phase} level={level} onRequest={() => setPhase('aangevraagd')} />
        </section>

        {/* Beheerder */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <SvgIcon name="users" size={15} className="text-purple-500" />
            <span className="text-[12px] text-fg-2">Beheerder-paneel <span className="text-fg-3">(mock)</span></span>
            {phase === 'aangevraagd' && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-500">
                <SvgIcon name="circle" size={8} /> 1 wachtend
              </span>
            )}
          </div>
          <BeheerderPaneel
            phase={phase}
            onApprove={() => setPhase('goedgekeurd')}
            onReject={() => setPhase('afgewezen')}
          />
        </section>
      </div>

      {/* Statusregel onderaan — maakt de huidige behandeling expliciet */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5 text-[12px]">
        {phase === 'goedgekeurd' ? (
          <span className="inline-flex items-center gap-1.5 text-green-500">
            <SvgIcon name="circle-check" size={13} />
            Ontgrendeld — pagina zichtbaar als {m.label.toLowerCase()}
          </span>
        ) : phase === 'aangevraagd' ? (
          <span className="inline-flex items-center gap-1.5 text-blue-500">
            <SvgIcon name="circle-notch" size={13} className="animate-spin" />
            Aanvraag in behandeling bij {BEHEERDER.name}
          </span>
        ) : phase === 'afgewezen' ? (
          <span className="inline-flex items-center gap-1.5 text-red-500">
            <SvgIcon name="triangle-exclamation" size={13} />
            Aanvraag afgewezen — pagina blijft vergrendeld
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-orange-500">
            <SvgIcon name="triangle-exclamation" size={13} />
            Vergrendeld — nog geen aanvraag gedaan
          </span>
        )}
      </div>
    </VariantShell>
  )
}
