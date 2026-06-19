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
  FEATURE_GROUPS,
  FeatureIcon,
  ROLES,
  roleById,
  levelMeta,
  LevelBadge,
  LevelSelect,
  RolePill,
  VariantShell,
  makePerm,
  type FeatureId,
  type Level,
  type PermMap,
  type RoleId,
} from '../shared'

// Variant "Invite-wizard": meerstaps wizard met voortgangsbalk.
//  1. E-mail invoeren  2. Rol kiezen (rol-kaarten)  3. (optioneel) fijn-afstemmen
//  per feature met LevelSelect die start vanaf de rol-perms en overrides toelaat.
// Afsluiten met samenvatting + Verstuur (mock: korte timeout → bevestiging).
// Volledige state lokaal; Terug/Volgende navigatie. Geen DB.

type StepId = 'email' | 'rol' | 'fijn' | 'check'

const STEPS: { id: StepId; label: string; icon: string }[] = [
  { id: 'email', label: 'E-mail', icon: 'user-plus' },
  { id: 'rol', label: 'Rol', icon: 'badge-check' },
  { id: 'fijn', label: 'Fijn-afstemmen', icon: 'settings' },
  { id: 'check', label: 'Versturen', icon: 'check' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Variant() {
  const [stepIdx, setStepIdx] = React.useState(0)
  const step = STEPS[stepIdx].id

  // Stap 1
  const [email, setEmail] = React.useState('')
  const emailOk = EMAIL_RE.test(email.trim())
  const [touched, setTouched] = React.useState(false)

  // Stap 2
  const [roleId, setRoleId] = React.useState<RoleId>('lid')
  const role = roleById(roleId)

  // Stap 3 — overrides bovenop de rol-perms
  const [overrides, setOverrides] = React.useState<Partial<PermMap>>({})

  // Effectieve perms = rol-perms + overrides
  const effective: PermMap = React.useMemo(
    () => ({ ...makePerm(0), ...role.perms, ...overrides }),
    [role, overrides],
  )
  const overrideCount = Object.keys(overrides).length

  // Versturen (mock)
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const setOverride = (f: FeatureId, level: Level) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (level === role.perms[f]) delete next[f]
      else next[f] = level
      return next
    })
  }
  const resetOverrides = () => setOverrides({})

  // Bij rolwissel: overrides wissen (ze hingen aan de vorige rol).
  const chooseRole = (id: RoleId) => {
    setRoleId(id)
    setOverrides({})
  }

  const canNext =
    step === 'email' ? emailOk : step === 'rol' ? true : true

  const goNext = () => {
    if (step === 'email' && !emailOk) {
      setTouched(true)
      return
    }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1))
  }
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0))

  const send = () => {
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      setSent(true)
    }, 1100)
  }

  const restart = () => {
    setSent(false)
    setSending(false)
    setEmail('')
    setTouched(false)
    setRoleId('lid')
    setOverrides({})
    setStepIdx(0)
  }

  // ── Bevestiging ────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <VariantShell title="Invite-wizard" blurb="E-mail → rol → optioneel fijn-afstemmen.">
        <div className="flex flex-col items-center rounded-xl border border-border-subtle bg-bg-2 px-6 py-12 text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-green-500/15">
            <SvgIcon name="check" size={26} className="text-green-500" />
          </span>
          <p className="text-[15px] font-medium text-fg-1">Uitnodiging verstuurd</p>
          <p className="mt-1 max-w-sm text-[13px] text-fg-3">
            We hebben een e-mail naar <span className="text-fg-1">{email.trim()}</span> gestuurd met de rol{' '}
            <span className={role.tint}>{role.name}</span>
            {overrideCount > 0 ? ` en ${overrideCount} aangepaste recht${overrideCount === 1 ? '' : 'en'}` : ''}.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={restart}>
              <SvgIcon name="user-plus" size={14} />
              Nog iemand uitnodigen
            </Button>
          </div>
        </div>
      </VariantShell>
    )
  }

  return (
    <VariantShell title="Invite-wizard" blurb="E-mail → rol → optioneel fijn-afstemmen.">
      {/* Voortgangsbalk */}
      <Stepper stepIdx={stepIdx} onJump={(i) => i < stepIdx && setStepIdx(i)} />

      {/* Stap-inhoud */}
      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-2 p-5">
        {step === 'email' && (
          <StepEmail
            email={email}
            setEmail={setEmail}
            emailOk={emailOk}
            touched={touched}
            onBlur={() => setTouched(true)}
            onSubmit={goNext}
          />
        )}

        {step === 'rol' && (
          <StepRol roleId={roleId} onChoose={chooseRole} />
        )}

        {step === 'fijn' && (
          <StepFijn
            role={role}
            effective={effective}
            overrides={overrides}
            overrideCount={overrideCount}
            onChange={setOverride}
            onReset={resetOverrides}
          />
        )}

        {step === 'check' && (
          <StepCheck
            email={email.trim()}
            roleId={roleId}
            effective={effective}
            overrides={overrides}
            overrideCount={overrideCount}
            onEditEmail={() => setStepIdx(0)}
            onEditRol={() => setStepIdx(1)}
            onEditFijn={() => setStepIdx(2)}
          />
        )}
      </div>

      {/* Navigatie */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {stepIdx > 0 && (
            <Button variant="ghost" size="sm" onClick={goBack} disabled={sending}>
              <SvgIcon name="arrow-left" size={14} />
              Terug
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step === 'fijn' && (
            <Button variant="ghost" size="sm" onClick={goNext} disabled={sending}>
              Overslaan
            </Button>
          )}

          {step === 'check' ? (
            <Button size="sm" onClick={send} disabled={sending}>
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
          ) : (
            <Button size="sm" onClick={goNext} disabled={!canNext}>
              {step === 'fijn' ? 'Doorgaan' : 'Volgende'}
              <SvgIcon name="chevron-right" size={14} />
            </Button>
          )}
        </div>
      </div>
    </VariantShell>
  )
}

// ── Voortgangsbalk ────────────────────────────────────────────────────────────
function Stepper({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  const pct = (stepIdx / (STEPS.length - 1)) * 100
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-1 px-5 py-4">
      {/* Rail */}
      <div className="relative mb-3 h-1 rounded-full bg-bg-3">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all', EASE, 'duration-300')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const done = i < stepIdx
          const active = i === stepIdx
          const clickable = i < stepIdx
          return (
            <button
              key={s.id}
              type="button"
              disabled={!clickable}
              onClick={() => onJump(i)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors',
                EASE,
                clickable ? 'cursor-pointer hover:bg-bg-3' : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors',
                  EASE,
                  done && 'bg-blue-500/15 text-blue-500',
                  active && 'bg-blue-500 text-bg-0',
                  !done && !active && 'bg-bg-3 text-fg-3',
                )}
              >
                {done ? <SvgIcon name="check" size={13} /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-[12px] transition-colors sm:inline',
                  active ? 'text-fg-1' : done ? 'text-fg-2' : 'text-fg-3',
                )}
              >
                {s.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Stap 1: e-mail ──────────────────────────────────────────────────────────
function StepEmail({
  email,
  setEmail,
  emailOk,
  touched,
  onBlur,
  onSubmit,
}: {
  email: string
  setEmail: (v: string) => void
  emailOk: boolean
  touched: boolean
  onBlur: () => void
  onSubmit: () => void
}) {
  const showError = touched && email.trim().length > 0 && !emailOk
  return (
    <div>
      <StepHead
        icon="user-plus"
        title="Wie wil je uitnodigen?"
        desc="Voer het zakelijke e-mailadres in. De uitgenodigde krijgt een mail om een account aan te maken."
      />
      <label className="mt-5 block text-[12px] text-fg-2">E-mailadres</label>
      <div className="relative mt-1.5">
        <SvgIcon
          name="user-plus"
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3"
        />
        <Input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && emailOk) onSubmit()
          }}
          placeholder="naam@bedrijf.nl"
          className={cn(
            'h-9 pl-8 text-[13px]',
            showError && 'border-red-500 focus-visible:border-red-500',
            emailOk && 'border-green-500/60',
          )}
        />
        {emailOk && (
          <SvgIcon
            name="circle-check"
            size={16}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500"
          />
        )}
      </div>
      {showError ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-500">
          <SvgIcon name="triangle-exclamation" size={12} />
          Dit lijkt geen geldig e-mailadres.
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] text-fg-3">Druk op Enter of klik op Volgende.</p>
      )}
    </div>
  )
}

// ── Stap 2: rol kiezen (rol-kaarten) ──────────────────────────────────────────
function StepRol({ roleId, onChoose }: { roleId: RoleId; onChoose: (id: RoleId) => void }) {
  return (
    <div>
      <StepHead
        icon="badge-check"
        title="Welke rol krijgt deze persoon?"
        desc="Een rol bepaalt de basisrechten. Daarna kun je per feature nog fijn-afstemmen."
      />
      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ROLES.map((r) => {
          const active = r.id === roleId
          // Telt features met enige toegang voor een compacte indicatie.
          const granted = FEATURES.filter((f) => r.perms[f.id] > 0).length
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChoose(r.id)}
              className={cn(
                'group relative rounded-xl border p-4 text-left transition-colors',
                EASE,
                active
                  ? 'border-blue-500 bg-blue-500/[0.06]'
                  : 'border-border-subtle bg-bg-1 hover:border-border-strong',
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn('flex size-8 items-center justify-center rounded-lg', r.bg)}>
                  <SvgIcon name="badge-check" size={16} className={r.tint} />
                </span>
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border transition-colors',
                    EASE,
                    active ? 'border-blue-500 bg-blue-500 text-bg-0' : 'border-border-strong text-transparent',
                  )}
                >
                  <SvgIcon name="check" size={12} />
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-fg-1">
                {r.name}
                {r.system && (
                  <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[10px] text-fg-3">systeem</span>
                )}
              </p>
              <p className="mt-0.5 text-[12px] text-fg-3">{r.desc}</p>
              <p className="mt-2.5 flex items-center gap-1 text-[11px] text-fg-3">
                <SvgIcon name="layers" size={11} />
                Toegang tot {granted} van {FEATURES.length} onderdelen
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Stap 3: optioneel fijn-afstemmen ─────────────────────────────────────────
function StepFijn({
  role,
  effective,
  overrides,
  overrideCount,
  onChange,
  onReset,
}: {
  role: ReturnType<typeof roleById>
  effective: PermMap
  overrides: Partial<PermMap>
  overrideCount: number
  onChange: (f: FeatureId, l: Level) => void
  onReset: () => void
}) {
  return (
    <div>
      <StepHead
        icon="settings"
        title="Wil je iets fijn-afstemmen?"
        desc="Optioneel. De niveaus starten bij de rol; pas alleen aan wat afwijkt. Klik anders op Overslaan."
      />

      <div className="mt-4 mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-fg-3">
          <span className="text-fg-2">Basis:</span>
          <RolePill roleId={role.id} active />
        </div>
        {overrideCount > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] text-fg-2 transition-colors hover:border-border-strong hover:text-fg-1',
              EASE,
            )}
          >
            <SvgIcon name="refresh" size={11} />
            {overrideCount} aanpassing{overrideCount === 1 ? '' : 'en'} terugzetten
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-3">
            <SvgIcon name="check" size={12} className="text-green-500" />
            Volledig volgens de rol
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border-subtle">
        {FEATURE_GROUPS.map((group) => {
          const inGroup = FEATURES.filter((f) => f.group === group)
          if (inGroup.length === 0) return null
          return (
            <div key={group}>
              <div className="bg-bg-1 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">
                {group}
              </div>
              {inGroup.map((f) => {
                const lvl = effective[f.id]
                const changed = overrides[f.id] !== undefined
                return (
                  <div
                    key={f.id}
                    className={cn(
                      'flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2 transition-colors first:border-t-0 hover:bg-bg-3/40',
                      EASE,
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn('flex size-7 items-center justify-center rounded-lg', levelMeta(lvl).bg)}>
                        <FeatureIcon id={f.id} size={14} className={levelMeta(lvl).tint} />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] text-fg-1">
                          {f.label}
                          {changed && (
                            <span className="size-1.5 rounded-full bg-orange-500" title="Afwijkend van de rol" />
                          )}
                        </p>
                        <p className="truncate text-[11px] text-fg-3">{f.desc}</p>
                      </div>
                    </div>
                    <LevelSelect value={lvl} onChange={(l) => onChange(f.id, l)} />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stap 4: samenvatting / check ──────────────────────────────────────────────
function StepCheck({
  email,
  roleId,
  effective,
  overrides,
  overrideCount,
  onEditEmail,
  onEditRol,
  onEditFijn,
}: {
  email: string
  roleId: RoleId
  effective: PermMap
  overrides: Partial<PermMap>
  overrideCount: number
  onEditEmail: () => void
  onEditRol: () => void
  onEditFijn: () => void
}) {
  const role = roleById(roleId)
  const grantedFeatures = FEATURES.filter((f) => effective[f.id] > 0)
  const overriddenFeatures = FEATURES.filter((f) => overrides[f.id] !== undefined)

  return (
    <div>
      <StepHead
        icon="check"
        title="Controleer en verstuur"
        desc="Dit krijgt de uitgenodigde te zien zodra het account is aangemaakt."
      />

      {/* E-mail + rol */}
      <div className="mt-5 space-y-2.5">
        <SummaryRow label="Uitnodigen" onEdit={onEditEmail}>
          <div className="flex items-center gap-2.5">
            <Avatar name={email} size={28} />
            <span className="text-[13px] text-fg-1">{email}</span>
          </div>
        </SummaryRow>

        <SummaryRow label="Rol" onEdit={onEditRol}>
          <div className="flex items-center gap-2">
            <RolePill roleId={roleId} active />
            <span className="text-[12px] text-fg-3">{role.desc}</span>
          </div>
        </SummaryRow>

        <SummaryRow
          label="Fijn-afstemming"
          onEdit={onEditFijn}
          editLabel={overrideCount > 0 ? 'Wijzig' : 'Toevoegen'}
        >
          {overrideCount > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {overriddenFeatures.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-bg-3 py-0.5 pl-1.5 pr-2 text-[11px] text-fg-2"
                >
                  <FeatureIcon id={f.id} size={11} className={levelMeta(effective[f.id]).tint} />
                  {f.label}
                  <span className="text-fg-3">→</span>
                  <span className={levelMeta(effective[f.id]).tint}>{levelMeta(effective[f.id]).short}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-3">
              <SvgIcon name="check" size={12} className="text-green-500" />
              Geen — volgt de rol {role.name}
            </span>
          )}
        </SummaryRow>
      </div>

      {/* Effectieve toegang in het kort */}
      <div className="mt-4 rounded-lg border border-border-subtle bg-bg-1 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-3">
          <SvgIcon name="layers" size={12} />
          Toegang tot {grantedFeatures.length} van {FEATURES.length} onderdelen
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grantedFeatures.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-2 py-1 pl-1.5 pr-2 text-[11px] text-fg-2"
            >
              <FeatureIcon id={f.id} size={12} className="text-fg-3" />
              {f.label}
              <LevelBadge level={effective[f.id]} withIcon={false} />
            </span>
          ))}
          {grantedFeatures.length === 0 && (
            <span className="text-[12px] text-fg-3">Deze rol geeft nog nergens toegang toe.</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Kleine helpers ────────────────────────────────────────────────────────────
function StepHead({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
        <SvgIcon name={icon} size={18} className="text-blue-500" />
      </span>
      <div>
        <p className="text-[14px] font-medium text-fg-1">{title}</p>
        <p className="mt-0.5 text-[12px] text-fg-3">{desc}</p>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  children,
  onEdit,
  editLabel = 'Wijzig',
}: {
  label: string
  children: React.ReactNode
  onEdit: () => void
  editLabel?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-bg-1 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-fg-3">{label}</p>
        {children}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1',
          EASE,
        )}
      >
        <SvgIcon name="pencil" size={12} />
        {editLabel}
      </button>
    </div>
  )
}
