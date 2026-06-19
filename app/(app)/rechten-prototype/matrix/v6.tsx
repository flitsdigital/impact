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
  featureById,
  LEVELS,
  levelMeta,
  LevelDot,
  useRolesState,
  VariantShell,
  type FeatureId,
  type Level,
  type Role,
} from '../shared'

// Variant "Regel-builder": rechten samenstellen als leesbare zinnen.
// Een composer-rij bouwt regels van de vorm "{rol} mogen {niveau} in {features}".
// Elke regel is een chip-rij die je kunt bewerken/verwijderen; samen bepalen ze de
// onderliggende matrix (last-rule-wins per rol+feature). Onderaan: effectieve samenvatting.

type Rule = {
  id: string
  roleId: string
  level: Level
  features: FeatureId[]
}

// Startregels die de bestaande presets leesbaar maken — meteen iets te zien/bewerken.
const SEED_RULES: Rule[] = [
  { id: 'r1', roleId: 'lid', level: 2, features: ['content', 'leads', 'projecten', 'taken'] },
  { id: 'r2', roleId: 'lid', level: 1, features: ['dashboard', 'facturatie'] },
  { id: 'r3', roleId: 'manager', level: 3, features: ['content', 'leads', 'klanten', 'projecten', 'taken'] },
  { id: 'r4', roleId: 'lezer', level: 1, features: ['dashboard', 'klanten', 'content', 'leads', 'projecten', 'taken', 'facturatie'] },
]

let ruleSeq = 100
const nextRuleId = () => `r${ruleSeq++}`

// Beheerder hoort altijd alles te kunnen; die laten we buiten de builder en tonen we apart.
const editableRoles = (roles: Role[]) => roles.filter((r) => r.id !== 'beheerder')

export default function Variant() {
  const { roles, setRoles } = useRolesState()
  const [rules, setRules] = React.useState<Rule[]>(SEED_RULES)

  const roleList = editableRoles(roles)

  // Effectieve matrix: start op "Geen" voor alle niet-beheerder-rollen, dan regels in volgorde toepassen.
  const matrix = React.useMemo(() => {
    const m: Record<string, Record<FeatureId, Level>> = {}
    for (const r of roleList) {
      m[r.id] = {} as Record<FeatureId, Level>
      for (const f of FEATURES) m[r.id][f.id] = 0
    }
    for (const rule of rules) {
      if (!m[rule.roleId]) continue
      for (const f of rule.features) m[rule.roleId][f] = rule.level
    }
    return m
  }, [rules, roleList])

  // Houd het gedeelde roles-model in sync, zodat de samenvatting met de echte atomen werkt.
  React.useEffect(() => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === 'beheerder' || !matrix[r.id]) return r
        return { ...r, perms: { ...r.perms, ...matrix[r.id] } }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix])

  const addRule = (rule: Rule) => setRules((rs) => [...rs, rule])
  const updateRule = (id: string, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id))

  const beheerder = roles.find((r) => r.id === 'beheerder')

  return (
    <VariantShell title="Regel-builder" blurb="Stel rechten samen als leesbare regels." wide>
      <div className="space-y-5">
        <Composer roles={roleList} onAdd={addRule} />

        <RuleList
          rules={rules}
          roles={roleList}
          onUpdate={updateRule}
          onRemove={removeRule}
        />

        <EffectiveSummary roles={roleList} matrix={matrix} rules={rules} beheerder={beheerder} />
      </div>
    </VariantShell>
  )
}

// ── Composer: bouw één nieuwe regel als zin ──────────────────────────────────
function Composer({ roles, onAdd }: { roles: Role[]; onAdd: (r: Rule) => void }) {
  const [roleId, setRoleId] = React.useState(roles[0]?.id ?? '')
  const [level, setLevel] = React.useState<Level>(2)
  const [features, setFeatures] = React.useState<FeatureId[]>([])

  const role = roles.find((r) => r.id === roleId)
  const lvl = levelMeta(level)
  const canAdd = roleId && level > 0 && features.length > 0

  const submit = () => {
    if (!canAdd) return
    onAdd({ id: nextRuleId(), roleId, level, features: [...features] })
    setFeatures([])
  }

  return (
    <div className="rounded-xl border border-border-strong bg-bg-1 p-4">
      <div className="mb-3 flex items-center gap-2 text-[12px] text-fg-3">
        <SvgIcon name="plus" size={13} />
        Nieuwe regel
      </div>

      {/* De zin */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 text-[14px] text-fg-2">
        <RolePicker roles={roles} value={roleId} onChange={setRoleId} />
        <span className="text-fg-3">mogen</span>
        <LevelPicker value={level} onChange={setLevel} />
        <span className="text-fg-3">in</span>
        <FeatureMultiPicker value={features} onChange={setFeatures} />
      </div>

      {/* Live preview van de zin */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <p className="min-w-0 flex-1 text-[12px] text-fg-3">
          {canAdd ? (
            <span className="text-fg-2">
              <span className={role?.tint}>{role?.name}</span> mogen{' '}
              <span className={lvl.tint}>{lvl.short.toLowerCase()}</span> in{' '}
              <span className="text-fg-1">{features.map((f) => featureById(f).label).join(', ')}</span>
            </span>
          ) : level === 0 ? (
            'Kies een niveau hoger dan "Geen" — dat is namelijk geen recht.'
          ) : (
            'Kies een rol, een niveau en minstens één onderdeel.'
          )}
        </p>
        <Button size="sm" disabled={!canAdd} onClick={submit}>
          <SvgIcon name="plus" size={13} /> Voeg regel toe
        </Button>
      </div>
    </div>
  )
}

// ── Regel-lijst: chip-rijen, inline bewerkbaar ───────────────────────────────
function RuleList({
  rules,
  roles,
  onUpdate,
  onRemove,
}: {
  rules: Rule[]
  roles: Role[]
  onUpdate: (id: string, patch: Partial<Rule>) => void
  onRemove: (id: string) => void
}) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-bg-1 py-10 text-center">
        <SvgIcon name="list-check" size={20} className="text-fg-3" />
        <p className="text-[13px] text-fg-2">Nog geen regels</p>
        <p className="text-[12px] text-fg-3">Iedereen begint zonder toegang. Voeg hierboven een regel toe.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-fg-3">{rules.length} regels</span>
        <span className="text-[11px] text-fg-3">Latere regel wint bij overlap</span>
      </div>
      {rules.map((rule, i) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          index={i}
          roles={roles}
          rules={rules}
          onUpdate={(patch) => onUpdate(rule.id, patch)}
          onRemove={() => onRemove(rule.id)}
        />
      ))}
    </div>
  )
}

function RuleRow({
  rule,
  index,
  roles,
  rules,
  onUpdate,
  onRemove,
}: {
  rule: Rule
  index: number
  roles: Role[]
  rules: Rule[]
  onUpdate: (patch: Partial<Rule>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const role = roles.find((r) => r.id === rule.roleId)
  const lvl = levelMeta(rule.level)

  // Welke features in deze regel worden later overschreven door een latere regel? (uitleg van conflicten)
  const overriddenLater = React.useMemo(() => {
    const set = new Set<FeatureId>()
    for (const f of rule.features) {
      for (let j = index + 1; j < rules.length; j++) {
        const later = rules[j]
        if (later.roleId === rule.roleId && later.features.includes(f)) {
          set.add(f)
          break
        }
      }
    }
    return set
  }, [rule, index, rules])

  return (
    <div
      className={cn(
        'rounded-xl border bg-bg-2 p-3 transition-colors',
        EASE,
        editing ? 'border-border-strong' : 'border-border-subtle hover:border-border-strong',
      )}
    >
      {!editing ? (
        <div className="flex items-center gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-0 text-[11px] text-fg-3">
            {index + 1}
          </span>

          {/* De leesbare regel-chip-rij */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px]">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]', role?.bg, role?.tint)}>
              <span className={cn('size-1.5 rounded-full', role?.tint.replace('text-', 'bg-'))} />
              {role?.name}
            </span>
            <span className="text-fg-3">mogen</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px]', lvl.bg, lvl.tint)}>
              <SvgIcon name={lvl.icon} size={11} />
              {lvl.short}
            </span>
            <span className="text-fg-3">in</span>
            {rule.features.map((f) => {
              const muted = overriddenLater.has(f)
              return (
                <span
                  key={f}
                  title={muted ? 'Wordt overschreven door een latere regel' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]',
                    muted
                      ? 'border-border-subtle text-fg-3 line-through decoration-fg-3/60'
                      : 'border-border-subtle bg-bg-3 text-fg-1',
                  )}
                >
                  <FeatureIcon id={f} size={11} className="text-fg-3" />
                  {featureById(f).label}
                </span>
              )
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setEditing(true)} title="Bewerken">
              <SvgIcon name="pencil" size={14} />
            </Button>
            <Button size="icon" variant="ghost" className="text-red-500" onClick={onRemove} title="Verwijderen">
              <SvgIcon name="trash" size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <RuleEditor
          rule={rule}
          roles={roles}
          onSave={(patch) => {
            onUpdate(patch)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}

function RuleEditor({
  rule,
  roles,
  onSave,
  onCancel,
}: {
  rule: Rule
  roles: Role[]
  onSave: (patch: Partial<Rule>) => void
  onCancel: () => void
}) {
  const [roleId, setRoleId] = React.useState(rule.roleId)
  const [level, setLevel] = React.useState<Level>(rule.level)
  const [features, setFeatures] = React.useState<FeatureId[]>([...rule.features])

  const canSave = roleId && level > 0 && features.length > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 text-[14px] text-fg-2">
        <RolePicker roles={roles} value={roleId} onChange={setRoleId} />
        <span className="text-fg-3">mogen</span>
        <LevelPicker value={level} onChange={setLevel} />
        <span className="text-fg-3">in</span>
        <FeatureMultiPicker value={features} onChange={setFeatures} />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuleren
        </Button>
        <Button size="sm" disabled={!canSave} onClick={() => onSave({ roleId, level, features: [...features] })}>
          <SvgIcon name="check" size={13} /> Opslaan
        </Button>
      </div>
    </div>
  )
}

// ── Effectieve samenvatting: compacte matrix per rol ─────────────────────────
function EffectiveSummary({
  roles,
  matrix,
  rules,
  beheerder,
}: {
  roles: Role[]
  matrix: Record<string, Record<FeatureId, Level>>
  rules: Rule[]
  beheerder?: Role
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SvgIcon name="table" size={14} className="text-fg-3" />
          <h4 className="text-[13px] font-medium text-fg-1">Effectieve rechten</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {LEVELS.map((l) => (
            <span key={l.value} className="inline-flex items-center gap-1 text-[11px] text-fg-3">
              <LevelDot level={l.value} size={7} />
              {l.short}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Beheerder als vaste, niet-bewerkbare rij — context voor de lezer. */}
        {beheerder && <SummaryRow role={beheerder} levels={beheerder.perms} fixed ruleCount={0} />}
        {roles.map((r) => (
          <SummaryRow
            key={r.id}
            role={r}
            levels={matrix[r.id]}
            ruleCount={rules.filter((rule) => rule.roleId === r.id).length}
          />
        ))}
      </div>
    </div>
  )
}

function SummaryRow({
  role,
  levels,
  fixed,
  ruleCount,
}: {
  role: Role
  levels: Record<FeatureId, Level>
  fixed?: boolean
  ruleCount: number
}) {
  const granted = FEATURES.filter((f) => levels[f.id] > 0).length

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-2 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', role.tint)}>
          <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
          {role.name}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-3">
          {fixed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-bg-3 px-2 py-0.5">
              <SvgIcon name="bolt" size={11} className="text-fg-2" />
              Altijd volledige toegang
            </span>
          ) : (
            <>
              <span>{granted}/{FEATURES.length} onderdelen</span>
              <span className="text-border-strong">·</span>
              <span>{ruleCount} {ruleCount === 1 ? 'regel' : 'regels'}</span>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {FEATURE_GROUPS.flatMap((g) => FEATURES.filter((f) => f.group === g)).map((f) => {
          const lvl = levels[f.id]
          const m = levelMeta(lvl)
          const off = lvl === 0
          return (
            <div
              key={f.id}
              className={cn('flex items-center justify-between gap-2 text-[12px]', off && 'opacity-45')}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5 text-fg-2">
                <FeatureIcon id={f.id} size={12} className="shrink-0 text-fg-3" />
                <span className="truncate">{featureById(f.id).label}</span>
              </span>
              <span className={cn('inline-flex shrink-0 items-center gap-1', m.tint)}>
                <SvgIcon name={m.icon} size={11} />
                <span className="text-[11px]">{m.short}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Pickers (portal-vrij, veilig binnen overlays) ────────────────────────────
function useDismiss(open: boolean, close: () => void) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])
  return ref
}

function RolePicker({ roles, value, onChange }: { roles: Role[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const role = roles.find((r) => r.id === value)
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
          EASE,
          role?.bg,
          role?.tint,
        )}
      >
        <span className={cn('size-1.5 rounded-full', role?.tint.replace('text-', 'bg-'))} />
        {role?.name ?? 'Kies rol'}
        <SvgIcon name="caret-down" size={12} className="opacity-70" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onChange(r.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3',
                r.id === value && 'bg-bg-3',
              )}
            >
              <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', r.tint.replace('text-', 'bg-'))} />
              <span className="flex min-w-0 flex-col">
                <span className={cn('text-[13px]', r.tint)}>{r.name}</span>
                <span className="truncate text-[11px] text-fg-3">{r.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LevelPicker({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const m = levelMeta(value)
  // "Geen" laten we niet kiezen — een regel kent altijd een echt recht toe.
  const options = LEVELS.filter((l) => l.value > 0)
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
          EASE,
          m.bg,
          m.tint,
        )}
      >
        <SvgIcon name={m.icon} size={12} />
        {m.short}
        <SvgIcon name="caret-down" size={12} className="opacity-70" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {options.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => {
                onChange(l.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3',
                l.value === value && 'bg-bg-3',
              )}
            >
              <SvgIcon name={l.icon} size={13} className={l.tint} />
              <span className="flex flex-col">
                <span className={cn('text-[13px]', l.tint)}>{l.label}</span>
                <span className="text-[11px] text-fg-3">{l.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureMultiPicker({ value, onChange }: { value: FeatureId[]; onChange: (v: FeatureId[]) => void }) {
  const [open, setOpen] = React.useState(false)
  const ref = useDismiss(open, () => setOpen(false))

  const toggle = (id: FeatureId) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  const selectAll = () => onChange(FEATURES.map((f) => f.id))
  const clear = () => onChange([])

  const label =
    value.length === 0
      ? 'Kies onderdelen'
      : value.length === FEATURES.length
        ? 'Alle onderdelen'
        : value.length <= 2
          ? value.map((f) => featureById(f).label).join(', ')
          : `${value.length} onderdelen`

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
          EASE,
          value.length > 0 ? 'border-border-strong bg-bg-3 text-fg-1' : 'border-border-subtle text-fg-2 hover:text-fg-1',
        )}
      >
        <SvgIcon name="grid-2" size={12} className="text-fg-3" />
        {label}
        <SvgIcon name="caret-down" size={12} className="opacity-70" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-64 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-border-subtle px-2 py-1.5">
            <span className="text-[11px] text-fg-3">{value.length} geselecteerd</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={selectAll} className="rounded px-1.5 py-0.5 text-[11px] text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1">
                Alles
              </button>
              <button type="button" onClick={clear} className="rounded px-1.5 py-0.5 text-[11px] text-fg-2 transition-colors hover:bg-bg-3 hover:text-fg-1">
                Wissen
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {FEATURE_GROUPS.map((g) => (
              <div key={g} className="mb-1 last:mb-0">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-fg-3">{g}</div>
                {FEATURES.filter((f) => f.group === g).map((f) => {
                  const on = value.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggle(f.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3"
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                          EASE,
                          on ? 'border-purple-500 bg-purple-500/15 text-purple-500' : 'border-border-strong text-transparent',
                        )}
                      >
                        <SvgIcon name="check" size={11} />
                      </span>
                      <FeatureIcon id={f.id} size={13} className="text-fg-3" />
                      <span className="flex-1 text-[13px] text-fg-1">{featureById(f.id).label}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
