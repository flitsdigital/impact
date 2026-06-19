'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURE_GROUPS,
  FEATURES,
  FeatureIcon,
  LevelBadge,
  ROLES,
  RolePill,
  VariantShell,
  roleById,
  type FeatureGroup,
  type Level,
} from '../shared'

// ponytail: variant "E-mail + live preview". Chip-input voor adressen + RolePills voor de rol,
// daarnaast een preview-paneel dat per feature het LevelBadge toont volgens de gekozen rol.
// Versturen is gemockt met een korte timeout → bevestiging.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Voornaam uit een e-mailadres halen, voor de "… krijgt toegang tot" kop.
function firstNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const part = local.split(/[._-]/)[0] ?? local
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : 'Deze persoon'
}

export default function Variant() {
  const [emails, setEmails] = React.useState<string[]>(['noa@bureau.nl'])
  const [draft, setDraft] = React.useState('')
  const [roleId, setRoleId] = React.useState(ROLES[2]?.id ?? ROLES[0].id) // standaard "Lid"
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const role = roleById(roleId)

  const addEmail = (raw: string) => {
    const value = raw.trim().replace(/[,;]+$/, '')
    if (!value) return
    if (!EMAIL_RE.test(value)) return
    setEmails((list) => (list.includes(value) ? list : [...list, value]))
    setDraft('')
  }

  const removeEmail = (email: string) =>
    setEmails((list) => list.filter((e) => e !== email))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
      if (draft.trim()) {
        e.preventDefault()
        addEmail(draft)
      }
      return
    }
    if (e.key === 'Backspace' && !draft && emails.length) {
      setEmails((list) => list.slice(0, -1))
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (/[,;\s]/.test(text)) {
      e.preventDefault()
      text.split(/[,;\s]+/).forEach((part) => addEmail(part))
    }
  }

  const draftValid = EMAIL_RE.test(draft.trim())
  const recipients = draftValid && !emails.includes(draft.trim())
    ? [...emails, draft.trim()]
    : emails
  const canSend = recipients.length > 0 && !sending

  // Eerste ontvanger bepaalt de naam in de preview-kop.
  const subjectName = recipients.length ? firstNameFromEmail(recipients[0]) : 'Noa'

  // Features groeperen per niveau-bucket, voor de samenvatting onderaan de preview.
  const visibleFeatures = FEATURES.filter((f) => role.perms[f.id] > 0)
  const hiddenFeatures = FEATURES.filter((f) => role.perms[f.id] === 0)

  const send = () => {
    if (!canSend) return
    if (draftValid) addEmail(draft)
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      setSent(true)
    }, 1100)
  }

  const reset = () => {
    setSent(false)
    setEmails([])
    setDraft('')
    setRoleId(ROLES[2]?.id ?? ROLES[0].id)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <VariantShell
      title="E-mail + live preview"
      blurb="Rol kiezen toont meteen waar iemand bij kan."
    >
      {sent ? (
        <Confirmation
          emails={emails}
          role={role}
          onAgain={reset}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* ── Formulier ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-border-subtle bg-bg-1 p-4">
            <Field
              label="E-mailadres(sen)"
              hint="Enter, komma of spatie voegt toe"
              icon="user-plus"
            >
              <div
                onClick={() => inputRef.current?.focus()}
                className={cn(
                  'flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-bg-2 px-2 py-1.5 transition-colors',
                  EASE,
                  'focus-within:border-border-strong',
                )}
              >
                {emails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 rounded-full bg-bg-3 py-0.5 pl-1 pr-1.5 text-[12px] text-fg-1"
                  >
                    <Avatar name={firstNameFromEmail(email)} size={18} />
                    {email}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeEmail(email)
                      }}
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full text-fg-3 transition-colors hover:bg-bg-0 hover:text-fg-1',
                        EASE,
                      )}
                      aria-label={`${email} verwijderen`}
                    >
                      <SvgIcon name="x" size={11} />
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  onPaste={onPaste}
                  onBlur={() => draft.trim() && addEmail(draft)}
                  placeholder={emails.length ? 'Nog een adres…' : 'naam@bedrijf.nl'}
                  className="h-6 min-w-[140px] flex-1 bg-transparent text-[13px] text-fg-1 outline-none placeholder:text-fg-3"
                />
              </div>
              {draft.trim() && !draftValid && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-orange-500">
                  <SvgIcon name="triangle-exclamation" size={11} />
                  Geen geldig e-mailadres
                </p>
              )}
            </Field>

            <div className="mt-5">
              <Field label="Rol" hint={role.desc}>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => (
                    <RolePill
                      key={r.id}
                      roleId={r.id}
                      active={r.id === roleId}
                      onClick={() => setRoleId(r.id)}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
              <p className="text-[12px] text-fg-3">
                {recipients.length === 0
                  ? 'Voeg een e-mailadres toe'
                  : `${recipients.length} ${recipients.length === 1 ? 'uitnodiging' : 'uitnodigingen'} klaar`}
              </p>
              <Button onClick={send} disabled={!canSend} size="sm">
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
            </div>
          </div>

          {/* ── Live preview ───────────────────────────────────────── */}
          <aside className="rounded-xl border border-border-subtle bg-bg-2 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-3">
              <SvgIcon name="signal-bars" size={12} className="text-blue-500" />
              Live preview
            </div>
            <p className="mt-2 text-[13px] text-fg-1">
              <span className={cn('font-medium', role.tint)}>{subjectName}</span>{' '}
              krijgt toegang tot…
            </p>
            <div className="mt-1.5">
              <RolePill roleId={role.id} active />
            </div>

            <div className="mt-3 space-y-3">
              {FEATURE_GROUPS.map((group) => (
                <PreviewGroup key={group} group={group} perms={role.perms} />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-[11px] text-fg-3">
              <span className="inline-flex items-center gap-1">
                <SvgIcon name="badge-check" size={12} className="text-green-500" />
                {visibleFeatures.length} toegankelijk
              </span>
              <span className="inline-flex items-center gap-1">
                <SvgIcon name="x" size={12} />
                {hiddenFeatures.length} verborgen
              </span>
            </div>
          </aside>
        </div>
      )}
    </VariantShell>
  )
}

// ── Veld-wrapper met label + optionele hint ───────────────────────────────────
function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string
  hint?: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[12px] font-medium text-fg-2">
          {icon && <SvgIcon name={icon} size={13} className="text-fg-3" />}
          {label}
        </label>
        {hint && <span className="truncate text-[11px] text-fg-3">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Preview-groep: features van één groep met hun LevelBadge ───────────────────
function PreviewGroup({
  group,
  perms,
}: {
  group: FeatureGroup
  perms: Record<string, Level>
}) {
  const items = FEATURES.filter((f) => f.group === group)
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-fg-3">
        {group}
      </p>
      <div className="space-y-0.5">
        {items.map((f) => {
          const level = perms[f.id] as Level
          const off = level === 0
          return (
            <div
              key={f.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md px-1.5 py-1 transition-opacity',
                EASE,
                off && 'opacity-40',
              )}
            >
              <span className="flex items-center gap-2 text-[12px] text-fg-1">
                <FeatureIcon id={f.id} size={14} className="text-fg-3" />
                {f.label}
              </span>
              <LevelBadge level={level} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Bevestiging na versturen ──────────────────────────────────────────────────
function Confirmation({
  emails,
  role,
  onAgain,
}: {
  emails: string[]
  role: ReturnType<typeof roleById>
  onAgain: () => void
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-1 p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-500/15">
        <SvgIcon name="circle-check" size={26} className="text-green-500" />
      </div>
      <h4 className="mt-3 text-[15px] font-medium text-fg-1">
        {emails.length === 1 ? 'Uitnodiging verstuurd' : `${emails.length} uitnodigingen verstuurd`}
      </h4>
      <p className="mt-1 text-[12px] text-fg-3">
        Als <span className={cn('font-medium', role.tint)}>{role.name}</span> — ze ontvangen een mail met een aanmeldlink.
      </p>

      <div className="mx-auto mt-4 max-w-sm space-y-1.5">
        {emails.map((email) => (
          <div
            key={email}
            className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-2 px-3 py-2 text-left"
          >
            <Avatar name={email.split('@')[0]} size={26} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-fg-1">{email}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-orange-500">
              <SvgIcon name="user-clock" size={12} />
              Uitgenodigd
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onAgain}>
          <SvgIcon name="user-plus" size={14} />
          Nog iemand uitnodigen
        </Button>
      </div>
    </div>
  )
}
