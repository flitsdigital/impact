'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  FEATURE_GROUPS,
  FeatureIcon,
  ROLES,
  actionsForLevel,
  levelMeta,
  roleById,
  ACTIONS,
  VariantShell,
  type FeatureId,
  type Level,
} from '../shared'

// ponytail: "Verborgen in nav" — de hardste vorm van gating. Geen recht (niveau 0) =
// het nav-item verdwijnt simpelweg. Wisselen van rol herschikt de zijbalk live.
// Direct-navigeren naar een verborgen feature toont een nette 404-achtige staat.

// Korte placeholder-content per feature, zodat de mock-pagina iets te laten zien heeft.
const FEATURE_BODY: Record<FeatureId, { metric: string; metricLabel: string; rows: string[] }> = {
  dashboard: { metric: '12', metricLabel: 'Actieve widgets', rows: ['Omzet deze maand', 'Open taken', 'Nieuwe leads'] },
  projecten: { metric: '8', metricLabel: 'Lopende projecten', rows: ['Website Bakker BV', 'Rebrand Noa', 'App Mees'] },
  taken: { metric: '23', metricLabel: 'Open taken', rows: ['Offerte nakijken', 'Content inplannen', 'Factuur sturen'] },
  content: { metric: '47', metricLabel: 'Geplande posts', rows: ['Instagram — di 10:00', 'LinkedIn — wo 14:00', 'Verhaal — do 09:00'] },
  klanten: { metric: '31', metricLabel: 'Klantdossiers', rows: ['Bakker BV', 'Studio Noa', 'Mees & Co'] },
  leads: { metric: '14', metricLabel: 'Open leads', rows: ['Offerte verstuurd', 'Eerste gesprek', 'Koud contact'] },
  facturatie: { metric: '€ 18.420', metricLabel: 'Openstaand', rows: ['F-2026-041 · Bakker BV', 'F-2026-040 · Studio Noa', 'F-2026-039 · Mees & Co'] },
  gebruikers: { metric: '5', metricLabel: 'Teamleden', rows: ['Jordi Klavers', 'Sam Lee', 'Mees Peters'] },
  instellingen: { metric: '3', metricLabel: 'Koppelingen', rows: ['Assistent', 'E-mail', 'Audit-log'] },
}

export default function Variant() {
  const [roleId, setRoleId] = React.useState('lid')
  const role = roleById(roleId)
  const perms = role.perms

  // De startpagina van de mock-app: 'facturatie' (de feature waar gating het meest speelt).
  const [active, setActive] = React.useState<FeatureId>('facturatie')

  // "Direct navigeren" — simuleer een gebruiker die de URL plakt van een verborgen feature.
  // Hiermee tonen we de 404-achtige staat ook al staat het item niet in de nav.
  const [forced, setForced] = React.useState(false)

  const visible = (f: FeatureId): boolean => perms[f] > 0
  const visibleFeatures = FEATURES.filter((f) => visible(f.id))
  const hiddenCount = FEATURES.length - visibleFeatures.length

  // Wissel van rol: zet de actieve pagina terug naar iets dat de nieuwe rol mág zien,
  // tenzij we expres een verborgen pagina forceren.
  const switchRole = (id: string) => {
    setRoleId(id)
    const np = roleById(id).perms
    if (!forced && np[active] === 0) {
      const firstVisible = FEATURES.find((f) => np[f.id] > 0)
      if (firstVisible) setActive(firstVisible.id)
    }
  }

  const openFeature = (f: FeatureId) => {
    setForced(false)
    setActive(f)
  }

  const activeLevel: Level = perms[active]
  const activeHidden = activeLevel === 0

  return (
    <VariantShell
      title="Verborgen in nav"
      blurb="Geen recht = niet in de navigatie."
    >
      {/* Rol-switcher + uitleg */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-1 px-4 py-3">
        <div className="flex items-center gap-2">
          <SvgIcon name="user" size={14} className="text-fg-3" />
          <span className="text-[12px] text-fg-2">Bekijk als rol</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-bg-0 p-1">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => switchRole(r.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition-colors',
                EASE,
                roleId === r.id ? cn(r.bg, r.tint) : 'text-fg-2 hover:text-fg-1',
              )}
            >
              <span className={cn('size-1.5 rounded-full', r.tint.replace('text-', 'bg-'))} />
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mock-app: zijbalk + paginavlak */}
      <div className="grid h-[520px] grid-cols-[208px_1fr] overflow-hidden rounded-xl border border-border-subtle bg-bg-1">
        {/* ── Zijbalk ─────────────────────────────────────────────── */}
        <nav className="flex flex-col border-r border-border-subtle bg-bg-0">
          <div className="flex items-center gap-2 px-4 py-3.5">
            <span className="grid size-6 place-items-center rounded-md bg-purple-500/15 text-purple-500">
              <SvgIcon name="bolt" size={13} />
            </span>
            <span className="text-[13px] font-medium text-fg-1">Flits CRM</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {FEATURE_GROUPS.map((group) => {
              const items = visibleFeatures.filter((f) => f.group === group)
              if (items.length === 0) return null
              return (
                <div key={group} className="mb-1.5">
                  <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-fg-3">{group}</p>
                  {items.map((f) => {
                    const lvl = perms[f.id]
                    const m = levelMeta(lvl)
                    const isActive = active === f.id && !forced
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => openFeature(f.id)}
                        title={`${f.label} — ${m.label}`}
                        className={cn(
                          'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                          EASE,
                          isActive ? 'bg-secondary text-fg-1' : 'text-fg-2 hover:bg-bg-3 hover:text-fg-1',
                        )}
                      >
                        <FeatureIcon id={f.id} size={15} className={isActive ? 'text-fg-1' : 'text-fg-3'} />
                        <span className="flex-1 truncate">{f.label}</span>
                        {/* subtiele niveau-stip; alleen 'Bekijken' krijgt een hint zodat read-only opvalt */}
                        {lvl === 1 && (
                          <SvgIcon name="magnifying-glass" size={11} className="text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Voet: hoeveel features verborgen zijn voor deze rol */}
          <div className="border-t border-border-subtle px-3 py-2.5">
            {hiddenCount > 0 ? (
              <p className="flex items-center gap-1.5 text-[11px] text-fg-3">
                <SvgIcon name="x" size={11} />
                {hiddenCount} {hiddenCount === 1 ? 'feature verborgen' : 'features verborgen'}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] text-green-500">
                <SvgIcon name="check" size={11} />
                Volledige toegang
              </p>
            )}
          </div>
        </nav>

        {/* ── Paginavlak ──────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-col">
          {activeHidden ? (
            <NotForYou feature={active} role={role.name} />
          ) : (
            <FeaturePage feature={active} level={activeLevel} />
          )}
        </div>
      </div>

      {/* "Direct navigeren" — demonstreert wat er gebeurt bij een verborgen URL */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-1 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <SvgIcon name="external-link" size={14} className="mt-0.5 text-fg-3" />
          <div>
            <p className="text-[12px] text-fg-2">Direct navigeren naar een verborgen pagina</p>
            <p className="text-[11px] text-fg-3">
              Simuleer een geplakte URL. Het item staat niet in de nav, maar de gebruiker probeert het tóch te openen.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={forced ? 'secondary' : 'outline'}
          onClick={() => {
            // Zoek een feature die deze rol NIET mag zien; val terug op 'facturatie'.
            const hidden = FEATURES.find((f) => perms[f.id] === 0)
            if (hidden) {
              setActive(hidden.id)
              setForced(true)
            }
          }}
          disabled={hiddenCount === 0}
        >
          <SvgIcon name="triangle-exclamation" size={13} />
          {hiddenCount === 0 ? 'Niets verborgen' : 'Open verborgen pagina'}
        </Button>
      </div>
    </VariantShell>
  )
}

// ── Normale feature-pagina (rol heeft minstens 'Bekijken') ──────────────────────
function FeaturePage({ feature, level }: { feature: FeatureId; level: Level }) {
  const f = FEATURES.find((x) => x.id === feature)!
  const body = FEATURE_BODY[feature]
  const m = levelMeta(level)
  const allowed = actionsForLevel(level)
  const canEdit = level >= 2

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pagina-header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-bg-2 text-fg-2">
            <FeatureIcon id={feature} size={18} />
          </span>
          <div>
            <h4 className="text-[15px] font-medium text-fg-1">{f.label}</h4>
            <p className="text-[12px] text-fg-3">{f.desc}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', m.bg, m.tint)}>
          <SvgIcon name={m.icon} size={11} />
          {m.label}
        </span>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto p-5">
        {/* Kerncijfer */}
        <div className="mb-4 flex items-end gap-4">
          <div className="rounded-xl border border-border-subtle bg-bg-2 px-4 py-3">
            <p className="text-[11px] text-fg-3">{body.metricLabel}</p>
            <p className="text-[22px] font-semibold text-fg-1 tabular-nums">{body.metric}</p>
          </div>
          {/* Acties die bij dit niveau horen — read-only mist 'aanmaken/bewerken' */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            {ACTIONS.map((a) => {
              const ok = allowed.includes(a.id)
              return (
                <span
                  key={a.id}
                  title={ok ? a.label : `${a.label} — geen recht`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors',
                    ok
                      ? 'border-border-subtle text-fg-2'
                      : 'border-border-subtle/60 text-fg-3 opacity-50',
                  )}
                >
                  <SvgIcon name={ok ? a.icon : 'x'} size={11} />
                  {a.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Lijst met regels */}
        <div className="overflow-hidden rounded-xl border border-border-subtle">
          {body.rows.map((r, i) => (
            <div
              key={r}
              className={cn(
                'flex items-center justify-between px-4 py-3 text-[13px] text-fg-1',
                i < body.rows.length - 1 && 'border-b border-border-subtle',
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="size-1.5 rounded-full bg-fg-3" />
                {r}
              </span>
              {canEdit ? (
                <span className="flex items-center gap-1 text-[12px] text-fg-3 transition-colors hover:text-fg-1">
                  <SvgIcon name="pencil" size={12} /> Bewerken
                </span>
              ) : (
                <span className="text-[11px] text-fg-3">Alleen lezen</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── "Deze pagina bestaat niet voor jou" (geforceerde navigatie) ─────────────────
function NotForYou({ feature, role }: { feature: FeatureId; role: string }) {
  const f = FEATURES.find((x) => x.id === feature)!
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-bg-2 text-fg-3">
        <SvgIcon name="triangle-exclamation" size={24} />
      </span>
      <h4 className="mt-4 text-[15px] font-medium text-fg-1">Deze pagina bestaat niet voor jou</h4>
      <p className="mt-1.5 max-w-xs text-[13px] text-fg-3">
        <span className="text-fg-2">{f.label}</span> is niet beschikbaar voor de rol{' '}
        <span className="text-fg-2">{role}</span>. Daarom staat het ook niet in je navigatie.
      </p>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-3 py-1 text-[11px] text-fg-3">
        <SvgIcon name="x" size={11} />
        Geen toegang
      </p>
      <p className="mt-5 max-w-xs text-[11px] text-fg-3">
        Denk je dat dit een vergissing is? Vraag een beheerder om je rechten aan te passen.
      </p>
    </div>
  )
}
