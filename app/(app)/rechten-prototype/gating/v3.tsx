'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  LEVELS,
  LevelBadge,
  VariantShell,
  actionsForLevel,
  levelMeta,
  type ActionId,
  type Level,
} from '../shared'

// ponytail: feature-gating variant "Read-only banner".
// De Facturatie-pagina is bij élk niveau ≥ 1 volledig zichtbaar — geen verborgen vlakken,
// geen lege staat. Bij niveau 1 (Bekijken) komt er een banner bovenaan en zijn alle
// muteer-acties (Nieuw/Bewerken/Verwijderen/Exporteren) uitgeschakeld. Vanaf niveau 2
// (Bewerken) verdwijnt de banner en worden de juiste knoppen actief — afgeleid uit
// actionsForLevel(). De "Bekijk als"-switcher verandert de behandeling live.

type Factuur = {
  nr: string
  klant: string
  bedrag: string
  vervalt: string
  status: 'betaald' | 'open' | 'verlopen' | 'concept'
}

const FACTUREN: Factuur[] = [
  { nr: 'F-2026-041', klant: 'Bakkerij De Korenbloem', bedrag: '€ 1.250,00', vervalt: '30 jun', status: 'open' },
  { nr: 'F-2026-040', klant: 'Studio Noorderlicht', bedrag: '€ 3.480,00', vervalt: '12 jun', status: 'verlopen' },
  { nr: 'F-2026-039', klant: 'Garage Veldhuis', bedrag: '€ 820,50', vervalt: '28 mei', status: 'betaald' },
  { nr: 'F-2026-038', klant: 'Kliniek Zonnehoek', bedrag: '€ 2.150,00', vervalt: '—', status: 'concept' },
  { nr: 'F-2026-037', klant: 'Tandartspraktijk Mond&Co', bedrag: '€ 640,00', vervalt: '05 jun', status: 'betaald' },
]

const STATUS_META: Record<Factuur['status'], { label: string; tint: string; bg: string; dot: string }> = {
  betaald: { label: 'Betaald', tint: 'text-green-500', bg: 'bg-green-500/15', dot: 'bg-green-500' },
  open: { label: 'Open', tint: 'text-blue-500', bg: 'bg-blue-500/15', dot: 'bg-blue-500' },
  verlopen: { label: 'Verlopen', tint: 'text-red-500', bg: 'bg-red-500/15', dot: 'bg-red-500' },
  concept: { label: 'Concept', tint: 'text-fg-3', bg: 'bg-bg-3', dot: 'bg-fg-3' },
}

// De acties die deze pagina aanbiedt, gemapt op de generieke ActionId's uit shared.
const TOP_ACTIONS: { action: ActionId; label: string; icon: string }[] = [
  { action: 'export', label: 'Exporteren', icon: 'download' },
  { action: 'create', label: 'Nieuwe factuur', icon: 'plus' },
]
const ROW_ACTIONS: { action: ActionId; label: string; icon: string; danger?: boolean }[] = [
  { action: 'edit', label: 'Bewerken', icon: 'pencil' },
  { action: 'delete', label: 'Verwijderen', icon: 'trash', danger: true },
]

function StatusPill({ status }: { status: Factuur['status'] }) {
  const m = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]', m.bg, m.tint)}>
      <span className={cn('size-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export default function Variant() {
  // "Bekijk als"-niveau. Default 1 zodat de read-only behandeling meteen zichtbaar is.
  const [level, setLevel] = React.useState<Level>(1)
  const [toast, setToast] = React.useState<string | null>(null)

  const allowed = React.useMemo(() => new Set(actionsForLevel(level)), [level])
  const can = (a: ActionId) => allowed.has(a)
  const readOnly = level <= 1

  const fire = (msg: string) => {
    setToast(msg)
    window.clearTimeout((fire as unknown as { t?: number }).t)
    ;(fire as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 1800)
  }

  return (
    <VariantShell title="Read-only banner" blurb="Volledig zichtbaar, wijzigen uitgeschakeld.">
      {/* "Bekijk als"-switcher */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-1 p-2 pl-3">
        <div className="flex items-center gap-2 text-[12px] text-fg-3">
          <SvgIcon name="user" size={13} />
          Bekijk als niveau
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-lg bg-bg-0 p-0.5">
          {LEVELS.filter((l) => l.value >= 1).map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              title={`${l.label} — ${l.desc}`}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors',
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

      {/* De feature-pagina: Facturatie */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
        {/* Read-only banner — alleen bij niveau 1 */}
        <div
          className={cn(
            'grid transition-all',
            EASE,
            'duration-200',
            readOnly ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className="flex items-start gap-2.5 border-b border-blue-500/20 bg-blue-500/15 px-4 py-3">
              <SvgIcon name="triangle-exclamation" size={15} className="mt-0.5 shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-fg-1">Je hebt alleen leesrechten — wijzigen is uitgeschakeld</p>
                <p className="text-[12px] text-fg-3">
                  Je kunt facturen bekijken, maar niet aanmaken, bewerken of verwijderen. Vraag een beheerder om
                  bewerkrechten.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Paginatitel + top-acties */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-bg-2 text-fg-2">
              <SvgIcon name="file-invoice-dollar" size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[14px] font-medium text-fg-1">Facturatie</h4>
                <LevelBadge level={level} />
              </div>
              <p className="text-[12px] text-fg-3">{FACTUREN.length} facturen · {levelMeta(level).desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {TOP_ACTIONS.map((a) => {
              const enabled = can(a.action)
              return (
                <Button
                  key={a.action}
                  size="sm"
                  variant={a.action === 'create' ? 'default' : 'outline'}
                  disabled={!enabled}
                  title={enabled ? undefined : 'Leesrechten — actie uitgeschakeld'}
                  onClick={() => enabled && fire(`${a.label} (mock)`)}
                >
                  <SvgIcon name={a.icon} size={13} />
                  {a.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Samenvattingsbalk — altijd zichtbaar (leesbaar) */}
        <div className="grid grid-cols-3 divide-x divide-border-subtle border-b border-border-subtle">
          {[
            { label: 'Openstaand', value: '€ 5.630,00', tint: 'text-blue-500' },
            { label: 'Verlopen', value: '€ 3.480,00', tint: 'text-red-500' },
            { label: 'Betaald (jun)', value: '€ 1.460,50', tint: 'text-green-500' },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-fg-3">{s.label}</p>
              <p className={cn('mt-0.5 text-[15px] font-medium', s.tint)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Facturentabel */}
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle text-[11px] uppercase tracking-wide text-fg-3">
              <th className="px-4 py-2.5 font-medium">Nummer</th>
              <th className="px-4 py-2.5 font-medium">Klant</th>
              <th className="px-4 py-2.5 font-medium">Bedrag</th>
              <th className="px-4 py-2.5 font-medium">Vervalt</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="w-20 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {FACTUREN.map((f) => (
              <tr key={f.nr} className={cn('group border-b border-border-subtle transition-colors last:border-0 hover:bg-bg-2', EASE)}>
                <td className="px-4 py-3 text-[13px] font-medium text-fg-1">{f.nr}</td>
                <td className="px-4 py-3 text-[13px] text-fg-2">{f.klant}</td>
                <td className="px-4 py-3 text-[13px] tabular-nums text-fg-1">{f.bedrag}</td>
                <td className="px-4 py-3 text-[13px] text-fg-3">{f.vervalt}</td>
                <td className="px-4 py-3"><StatusPill status={f.status} /></td>
                <td className="px-2 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {ROW_ACTIONS.map((a) => {
                      const enabled = can(a.action)
                      return (
                        <button
                          key={a.action}
                          type="button"
                          disabled={!enabled}
                          title={enabled ? a.label : 'Leesrechten — actie uitgeschakeld'}
                          onClick={() => enabled && fire(`${a.label}: ${f.nr} (mock)`)}
                          className={cn(
                            'flex size-7 items-center justify-center rounded-md transition-colors',
                            EASE,
                            enabled
                              ? a.danger
                                ? 'text-fg-3 hover:bg-red-500/15 hover:text-red-500'
                                : 'text-fg-3 hover:bg-bg-3 hover:text-fg-1'
                              : 'cursor-not-allowed text-fg-3/40',
                          )}
                        >
                          <SvgIcon name={a.icon} size={14} />
                        </button>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Voetregel: welke acties zijn op dit niveau toegestaan */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle bg-bg-1 px-4 py-2.5 text-[11px] text-fg-3">
          <span>Toegestaan op dit niveau:</span>
          {actionsForLevel(level).map((aid) => {
            const meta = [...TOP_ACTIONS, ...ROW_ACTIONS, { action: 'view' as ActionId, label: 'Bekijken', icon: 'magnifying-glass' }].find(
              (x) => x.action === aid,
            )
            if (!meta) return null
            return (
              <span key={aid} className="inline-flex items-center gap-1 rounded-full bg-bg-2 px-2 py-0.5 text-fg-2">
                <SvgIcon name={meta.icon} size={11} />
                {meta.label}
              </span>
            )
          })}
        </div>
      </div>

      {/* Mini-toast bij een (toegestane) actie */}
      <div
        className={cn(
          'pointer-events-none mt-3 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-2 px-3 py-2 text-[12px] text-fg-2 transition-all',
          EASE,
          'duration-200',
          toast ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
        )}
      >
        <SvgIcon name="circle-check" size={14} className="text-green-500" />
        {toast ?? 'Actie uitgevoerd'}
      </div>
    </VariantShell>
  )
}
