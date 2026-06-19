'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  ACTIONS,
  EASE,
  FeatureIcon,
  LEVELS,
  LevelBadge,
  USERS,
  VariantShell,
  actionsForLevel,
  levelMeta,
  type ActionId,
  type Level,
} from '../shared'

// Variant "Empty-state vervanging": bij niveau 0 vervangt een vriendelijke empty-state
// de héle pagina-inhoud (grote FeatureIcon + uitleg + "vraag toegang"-CTA met de
// beheerder uit USERS). Vanaf niveau 1 verschijnt de echte Facturatie-pagina; de
// beschikbare acties schalen mee via actionsForLevel(). Alles state-gedreven (mock).

const FEATURE: 'facturatie' = 'facturatie'

// De beheerder waar je toegang aan vraagt: eerste actieve beheerder uit het model.
const ADMIN = USERS.find((u) => u.roleId === 'beheerder') ?? USERS[0]

// Mock-facturen voor de "echte" pagina. Bedragen in centen → euro.
type Factuur = { id: string; klant: string; bedrag: number; status: 'betaald' | 'open' | 'verlopen'; datum: string }
const FACTUREN: Factuur[] = [
  { id: 'F-2026-041', klant: 'Bakkerij De Vries', bedrag: 145200, status: 'betaald', datum: '12 jun' },
  { id: 'F-2026-040', klant: 'Studio Noord', bedrag: 89500, status: 'open', datum: '9 jun' },
  { id: 'F-2026-039', klant: 'Garage Bos', bedrag: 312000, status: 'open', datum: '4 jun' },
  { id: 'F-2026-038', klant: 'Kapsalon Lux', bedrag: 67500, status: 'verlopen', datum: '21 mei' },
  { id: 'F-2026-037', klant: 'Hoveniers Groen', bedrag: 198000, status: 'betaald', datum: '14 mei' },
]

const euro = (cents: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(cents / 100)

const STATUS_META: Record<Factuur['status'], { label: string; tint: string; bg: string }> = {
  betaald: { label: 'Betaald', tint: 'text-green-500', bg: 'bg-green-500/15' },
  open: { label: 'Open', tint: 'text-blue-500', bg: 'bg-blue-500/15' },
  verlopen: { label: 'Verlopen', tint: 'text-red-500', bg: 'bg-red-500/15' },
}

const actionIcon = (id: ActionId) => ACTIONS.find((a) => a.id === id)!

// ── Empty-state (niveau 0): vervangt de héle pagina ──────────────────────────
function GeenToegang() {
  const [verzonden, setVerzonden] = React.useState(false)

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-1 px-6 py-14">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        {/* Groot illustratie-achtig icoon-blok */}
        <div className="relative mb-6">
          <div className={cn('grid size-24 place-items-center rounded-2xl bg-bg-2 ring-1 ring-border-subtle', EASE)}>
            <FeatureIcon id={FEATURE} size={40} className="text-fg-3" />
          </div>
          {/* "afgesloten"-markering rechtsonder — geen lock-icoon beschikbaar, dus x-badge */}
          <span className="absolute -bottom-1.5 -right-1.5 grid size-8 place-items-center rounded-full bg-red-500/15 ring-4 ring-bg-1">
            <SvgIcon name="x" size={15} className="text-red-500" />
          </span>
        </div>

        <h2 className="text-[18px] font-semibold text-fg-1">Je hebt nog geen toegang tot Facturatie</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-fg-3">
          Facturen, omzet en betaalstatussen zijn afgeschermd. Je beheerder kan je in een paar
          tellen toegang geven — dan verschijnt deze pagina meteen voor je.
        </p>

        {/* Beheerder-kaart + CTA */}
        <div className="mt-7 w-full rounded-xl border border-border-subtle bg-bg-2 p-4 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-fg-3">Beheerder van deze werkruimte</p>
          <div className="mt-2.5 flex items-center gap-3">
            <Avatar name={ADMIN.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg-1">{ADMIN.name}</p>
              <p className="truncate text-[12px] text-fg-3">{ADMIN.email}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] text-purple-500">
              <SvgIcon name="bolt" size={11} /> Beheerder
            </span>
          </div>

          <div className="mt-4">
            {verzonden ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/15 px-3 py-2.5 text-[13px] text-green-500">
                <SvgIcon name="circle-check" size={16} />
                <span className="flex-1">
                  Aanvraag verstuurd naar {ADMIN.name.split(' ')[0]}. Je krijgt bericht zodra het is goedgekeurd.
                </span>
                <button
                  type="button"
                  onClick={() => setVerzonden(false)}
                  className={cn('text-[12px] text-fg-3 underline-offset-2 hover:text-fg-1 hover:underline', EASE)}
                >
                  Ongedaan maken
                </button>
              </div>
            ) : (
              <Button className="w-full" onClick={() => setVerzonden(true)}>
                <SvgIcon name="user-plus" size={15} /> Vraag het aan een beheerder
              </Button>
            )}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-fg-3">
          Of bekijk de modules waar je wél bij kunt via het zijmenu.
        </p>
      </div>
    </div>
  )
}

// ── Echte Facturatie-pagina (niveau ≥ 1) ─────────────────────────────────────
function FacturatiePagina({ level }: { level: Level }) {
  const allowed = actionsForLevel(level)
  const totaalOpen = FACTUREN.filter((f) => f.status !== 'betaald').reduce((s, f) => s + f.bedrag, 0)
  const totaalBetaald = FACTUREN.filter((f) => f.status === 'betaald').reduce((s, f) => s + f.bedrag, 0)
  const verlopen = FACTUREN.filter((f) => f.status === 'verlopen').length

  // Toon de niet-lees-acties als knoppen die met het niveau mee verschijnen.
  const knoppen = allowed.filter((a) => a !== 'view')

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-1">
      {/* Kop met titel + niveau-afhankelijke acties */}
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-bg-2 text-fg-2">
            <FeatureIcon id={FEATURE} size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-fg-1">Facturatie</h2>
            <p className="text-[12px] text-fg-3">Facturen & omzet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LevelBadge level={level} />
          {knoppen.map((a) => {
            const meta = actionIcon(a)
            const primary = a === 'create'
            return (
              <Button key={a} size="sm" variant={primary ? 'default' : 'outline'}>
                <SvgIcon name={meta.icon} size={13} /> {a === 'create' ? 'Nieuwe factuur' : meta.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* KPI-strip */}
      <div className="grid grid-cols-3 gap-px border-b border-border-subtle bg-border-subtle">
        {[
          { label: 'Openstaand', value: euro(totaalOpen), tint: 'text-blue-500', icon: 'clock' },
          { label: 'Geïnd deze maand', value: euro(totaalBetaald), tint: 'text-green-500', icon: 'coin-vertical' },
          { label: 'Verlopen', value: String(verlopen), tint: 'text-red-500', icon: 'triangle-exclamation' },
        ].map((k) => (
          <div key={k.label} className="bg-bg-1 px-5 py-4">
            <div className="flex items-center gap-1.5 text-[11px] text-fg-3">
              <SvgIcon name={k.icon} size={12} className={k.tint} /> {k.label}
            </div>
            <p className="mt-1 text-[18px] font-semibold text-fg-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Facturen-tabel */}
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle text-[12px] text-fg-3">
            <th className="px-5 py-2.5 font-medium">Factuur</th>
            <th className="px-5 py-2.5 font-medium">Klant</th>
            <th className="px-5 py-2.5 font-medium">Datum</th>
            <th className="px-5 py-2.5 text-right font-medium">Bedrag</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {FACTUREN.map((f) => {
            const sm = STATUS_META[f.status]
            return (
              <tr key={f.id} className={cn('border-b border-border-subtle last:border-0 transition-colors hover:bg-bg-2', EASE)}>
                <td className="px-5 py-3 text-[13px] font-medium text-fg-1">{f.id}</td>
                <td className="px-5 py-3 text-[13px] text-fg-2">{f.klant}</td>
                <td className="px-5 py-3 text-[12px] text-fg-3">{f.datum}</td>
                <td className="px-5 py-3 text-right text-[13px] tabular-nums text-fg-1">{euro(f.bedrag)}</td>
                <td className="px-5 py-3">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', sm.bg, sm.tint)}>
                    {sm.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {/* Rij-actie alleen vanaf bewerken; anders neutraal "bekijken" */}
                  {level >= 2 ? (
                    <button type="button" className={cn('rounded-md p-1 text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1', EASE)} aria-label="Bewerk factuur">
                      <SvgIcon name="pencil" size={14} />
                    </button>
                  ) : (
                    <button type="button" className={cn('rounded-md p-1 text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1', EASE)} aria-label="Bekijk factuur">
                      <SvgIcon name="magnifying-glass" size={14} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Variant() {
  // "Bekijk als" — niveau-switcher die de behandeling live verandert.
  const [level, setLevel] = React.useState<Level>(0)
  const meta = levelMeta(level)

  return (
    <VariantShell
      title="Empty-state vervanging"
      blurb='Vriendelijke "vraag toegang" in plaats van de pagina.'
    >
      {/* Bekijk-als balk */}
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[12px] text-fg-3">
          <SvgIcon name="smile" size={14} />
          <span>Bekijk Facturatie als iemand met niveau:</span>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-bg-0 p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              title={`${l.label} — ${l.desc}`}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition-colors',
                EASE,
                level === l.value ? cn('bg-secondary', l.tint) : 'text-fg-3 hover:text-fg-1',
              )}
            >
              <SvgIcon name={l.icon} size={12} />
              {l.short}
            </button>
          ))}
        </div>
      </div>

      {/* Live behandeling: niveau 0 → empty-state vervangt alles; ≥ 1 → echte pagina */}
      {level === 0 ? <GeenToegang /> : <FacturatiePagina level={level} />}

      {/* Korte uitleg onder de behandeling — context voor de reviewer */}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-3">
        <SvgIcon name="signal-bars" size={12} className={meta.tint} />
        {level === 0
          ? 'Niveau 0: de pagina-inhoud wordt volledig vervangen door een uitnodigende empty-state met directe toegang-aanvraag.'
          : `Niveau ${level} (${meta.label}): de echte pagina verschijnt; acties schalen mee met het niveau.`}
      </p>
    </VariantShell>
  )
}
