'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import {
  EASE,
  FEATURES,
  LevelBadge,
  VariantShell,
  roleById,
  ROLES,
  type Level,
  type PermMap,
  type RoleId,
} from '../shared'

// Variant "Bulk met rol-kolom": plak een lijst e-mails → één rij per adres in een tabel.
// Per rij een rol-kiezer, bovenin "stel rol voor allen" als bulk. Live geldig/ongeldig telling.
// Versturen is mock (per-rij timeout) → per-rij "verstuurd"-status. Geen DB.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RowStatus = 'klaar' | 'bezig' | 'verstuurd'
type Row = {
  key: string
  email: string
  roleId: RoleId
  valid: boolean
  duplicate: boolean
  status: RowStatus
}

let _seq = 0
const nextKey = () => `r${++_seq}`

/** Splits ruwe invoer (komma's, puntkomma's, spaties, regels) in losse adressen. */
function splitEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Hoeveel features krijgt deze rol écht toegang tot (> Geen). */
function grantedCount(perms: PermMap): number {
  return FEATURES.reduce((n, f) => n + (perms[f.id] > 0 ? 1 : 0), 0)
}

/** Compacte rol-dropdown voor in een tabelrij (zonder portal, veilig in overlays). */
function RoleCell({
  value,
  onChange,
  disabled,
}: {
  value: RoleId
  onChange: (id: RoleId) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const r = roleById(value)
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors',
          EASE,
          disabled ? 'cursor-default opacity-60' : 'hover:opacity-90',
          r.bg,
          r.tint,
        )}
      >
        <span className={cn('size-1.5 rounded-full', r.tint.replace('text-', 'bg-'))} />
        {r.name}
        {!disabled && <SvgIcon name="chevron-down" size={12} className="text-fg-3" />}
      </button>
      {open && !disabled && (
        <div className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 p-1 shadow-lg">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => {
                onChange(role.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg-3',
                value === role.id && 'bg-bg-3',
              )}
            >
              <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', role.tint.replace('text-', 'bg-'))} />
              <span className="flex min-w-0 flex-col">
                <span className={cn('flex items-center gap-1.5 text-[12px]', role.tint)}>
                  {role.name}
                  {role.system && (
                    <span className="rounded bg-bg-3 px-1 text-[10px] text-fg-3">systeem</span>
                  )}
                </span>
                <span className="truncate text-[11px] text-fg-3">{role.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Variant() {
  const [raw, setRaw] = React.useState('')
  const [bulkRole, setBulkRole] = React.useState<RoleId>('lid')
  const [rows, setRows] = React.useState<Row[]>([])
  const [sending, setSending] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [preview, setPreview] = React.useState<RoleId | null>(null)

  // ── Rijen toevoegen vanuit het plak-veld ──────────────────────────────────
  const addFromRaw = () => {
    const candidates = splitEmails(raw)
    if (candidates.length === 0) return
    setRows((prev) => {
      const seen = new Set(prev.map((r) => r.email.toLowerCase()))
      const next = [...prev]
      for (const email of candidates) {
        const lower = email.toLowerCase()
        const valid = EMAIL_RE.test(email)
        const duplicate = seen.has(lower)
        if (!duplicate) seen.add(lower)
        next.push({
          key: nextKey(),
          email,
          roleId: bulkRole,
          valid,
          duplicate,
          status: 'klaar',
        })
      }
      return next
    })
    setRaw('')
    setDone(false)
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    // Alleen auto-splitsen bij meervoudige adressen; losse typ-actie blijft normaal.
    if (text && splitEmails(text).length > 1) {
      e.preventDefault()
      const candidates = splitEmails(text)
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.email.toLowerCase()))
        const next = [...prev]
        for (const email of candidates) {
          const lower = email.toLowerCase()
          const valid = EMAIL_RE.test(email)
          const duplicate = seen.has(lower)
          if (!duplicate) seen.add(lower)
          next.push({ key: nextKey(), email, roleId: bulkRole, valid, duplicate, status: 'klaar' })
        }
        return next
      })
      setDone(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && raw.includes('@') && !e.shiftKey)) {
      e.preventDefault()
      addFromRaw()
    }
  }

  // ── Rij-mutaties ───────────────────────────────────────────────────────────
  const setRowRole = (key: string, roleId: RoleId) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, roleId } : r)))

  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key))

  const applyBulkRole = () =>
    setRows((rs) => rs.map((r) => (r.status === 'verstuurd' ? r : { ...r, roleId: bulkRole })))

  const removeInvalid = () =>
    setRows((rs) => rs.filter((r) => r.valid && !r.duplicate))

  const clearAll = () => {
    setRows([])
    setDone(false)
  }

  // ── Tellingen ──────────────────────────────────────────────────────────────
  const total = rows.length
  const sendable = rows.filter((r) => r.valid && !r.duplicate)
  const invalidCount = rows.filter((r) => !r.valid).length
  const dupCount = rows.filter((r) => r.duplicate).length
  const sentCount = rows.filter((r) => r.status === 'verstuurd').length
  const pendingCount = sendable.filter((r) => r.status !== 'verstuurd').length

  // ── Versturen (mock, per rij) ──────────────────────────────────────────────
  const send = async () => {
    if (sending || pendingCount === 0) return
    setSending(true)
    setDone(false)
    const queue = sendable.filter((r) => r.status !== 'verstuurd')
    for (const r of queue) {
      setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, status: 'bezig' } : x)))
      await new Promise((res) => setTimeout(res, 420))
      setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, status: 'verstuurd' } : x)))
    }
    setSending(false)
    setDone(true)
  }

  const previewRole = preview ? roleById(preview) : null

  return (
    <VariantShell title="Bulk met rol-kolom" blurb="Plak een lijst, zet een rol per regel." wide>
      <div className="flex flex-col gap-4">
        {/* Plak-veld */}
        <div className="rounded-xl border border-border-subtle bg-bg-2 p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-[13px] font-medium text-fg-1">
              <SvgIcon name="user-plus" size={15} className="text-fg-2" />
              E-mailadressen plakken
            </label>
            <span className="text-[11px] text-fg-3">Scheid met komma, spatie of nieuwe regel</span>
          </div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            rows={3}
            placeholder="noa@bureau.nl, tim@flits.nl&#10;mees@klant.com"
            className={cn(
              'w-full resize-none rounded-lg border border-border-subtle bg-bg-0 px-3 py-2 text-[13px] text-fg-1 outline-none transition-colors placeholder:text-fg-3',
              'focus:border-border-strong',
            )}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-fg-3">
              <span>Standaardrol bij toevoegen:</span>
              <RoleCell value={bulkRole} onChange={setBulkRole} />
            </div>
            <Button size="sm" variant="secondary" onClick={addFromRaw} disabled={splitEmails(raw).length === 0}>
              <SvgIcon name="plus" size={14} />
              Toevoegen
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-bg-1 px-6 py-12 text-center">
            <SvgIcon name="inbox" size={28} className="text-fg-3" />
            <p className="text-[13px] text-fg-2">Nog geen adressen</p>
            <p className="max-w-xs text-[12px] text-fg-3">
              Plak een lijst e-mailadressen hierboven. Elk adres komt als losse regel met een eigen rol.
            </p>
          </div>
        ) : (
          <>
            {/* Telling + bulk-acties */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-green-500">
                  <SvgIcon name="circle-check" size={13} />
                  {sendable.length} geldig
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-red-500">
                    <SvgIcon name="triangle-exclamation" size={13} />
                    {invalidCount} ongeldig
                  </span>
                )}
                {dupCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-1 text-orange-500">
                    <SvgIcon name="layers" size={13} />
                    {dupCount} dubbel
                  </span>
                )}
                <span className="text-fg-3">·</span>
                <span className="text-fg-3">{total} in totaal</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-fg-3">Rol voor allen:</span>
                <RoleCell value={bulkRole} onChange={setBulkRole} disabled={sending} />
                <Button size="xs" variant="outline" onClick={applyBulkRole} disabled={sending}>
                  <SvgIcon name="arrows-sort" size={12} />
                  Toepassen op allen
                </Button>
                {(invalidCount > 0 || dupCount > 0) && (
                  <Button size="xs" variant="ghost" onClick={removeInvalid} disabled={sending} className="text-fg-2">
                    <SvgIcon name="filter" size={12} />
                    Ongeldige weg
                  </Button>
                )}
              </div>
            </div>

            {/* Tabel */}
            <div className="overflow-hidden rounded-xl border border-border-subtle">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-subtle bg-bg-1 text-[11px] uppercase tracking-wide text-fg-3">
                    <th className="px-4 py-2.5 font-medium">E-mailadres</th>
                    <th className="px-4 py-2.5 font-medium">Rol</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const bad = !r.valid || r.duplicate
                    return (
                      <tr
                        key={r.key}
                        className={cn(
                          'border-b border-border-subtle last:border-0 transition-colors',
                          EASE,
                          r.status === 'verstuurd' && 'bg-green-500/5',
                          bad && r.status !== 'verstuurd' && 'bg-red-500/5',
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <SvgIcon
                              name={
                                r.duplicate
                                  ? 'layers'
                                  : r.valid
                                    ? 'badge-check'
                                    : 'triangle-exclamation'
                              }
                              size={14}
                              className={cn(
                                r.duplicate ? 'text-orange-500' : r.valid ? 'text-green-500' : 'text-red-500',
                              )}
                            />
                            <span className={cn('text-[13px]', bad ? 'text-fg-2' : 'text-fg-1')}>{r.email}</span>
                            {!r.valid && <span className="text-[11px] text-red-500">ongeldig</span>}
                            {r.duplicate && <span className="text-[11px] text-orange-500">dubbel</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {bad ? (
                            <span className="text-[12px] text-fg-3">—</span>
                          ) : (
                            <RoleCell
                              value={r.roleId}
                              onChange={(id) => setRowRole(r.key, id)}
                              disabled={r.status !== 'klaar'}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {r.status === 'verstuurd' ? (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-green-500">
                              <SvgIcon name="circle-check" size={14} />
                              Verstuurd
                            </span>
                          ) : r.status === 'bezig' ? (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-blue-500">
                              <SvgIcon name="circle-notch" size={14} className="animate-spin" />
                              Versturen…
                            </span>
                          ) : bad ? (
                            <span className="text-[12px] text-fg-3">Wordt overgeslagen</span>
                          ) : (
                            <span className="text-[12px] text-fg-3">Klaar</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            onClick={() => removeRow(r.key)}
                            disabled={sending}
                            title="Verwijderen"
                            className={cn(
                              'flex size-7 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-bg-3 hover:text-red-500',
                              EASE,
                              sending && 'pointer-events-none opacity-40',
                            )}
                          >
                            <SvgIcon name="x" size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Preview van rechten per rol */}
            <div className="rounded-xl border border-border-subtle bg-bg-2 p-4">
              <div className="mb-3 flex items-center gap-2">
                <SvgIcon name="badge-check" size={15} className="text-fg-2" />
                <h4 className="text-[13px] font-medium text-fg-1">Preview — wat krijgen ze te zien?</h4>
                <span className="text-[11px] text-fg-3">Tik een rol aan om de rechten te bekijken</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const count = rows.filter(
                    (r) => r.valid && !r.duplicate && r.roleId === role.id,
                  ).length
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setPreview((p) => (p === role.id ? null : role.id))}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] transition-colors',
                        EASE,
                        preview === role.id
                          ? cn(role.bg, role.tint, 'border-transparent')
                          : 'border-border-subtle text-fg-2 hover:text-fg-1',
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full', role.tint.replace('text-', 'bg-'))} />
                      {role.name}
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-[11px]',
                          preview === role.id ? 'bg-bg-0/40' : 'bg-bg-3 text-fg-3',
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
              {previewRole && (
                <div className="mt-3 rounded-lg border border-border-subtle bg-bg-1 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[12px] text-fg-2">{previewRole.desc}</p>
                    <span className="text-[11px] text-fg-3">
                      Toegang tot {grantedCount(previewRole.perms)} van {FEATURES.length} modules
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((f) => {
                      const lvl = previewRole.perms[f.id] as Level
                      return (
                        <div
                          key={f.id}
                          className={cn(
                            'flex items-center justify-between rounded-md px-2 py-1.5',
                            lvl > 0 ? 'bg-bg-2' : 'opacity-50',
                          )}
                        >
                          <span className="flex items-center gap-2 text-[12px] text-fg-2">
                            <SvgIcon name={f.icon} size={13} className="text-fg-3" />
                            {f.label}
                          </span>
                          <LevelBadge level={lvl} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Verstuur-balk */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-2 px-4 py-3 shadow-lg">
              <div className="flex items-center gap-2 text-[12px]">
                {done ? (
                  <span className="inline-flex items-center gap-1.5 text-green-500">
                    <SvgIcon name="circle-check" size={15} />
                    {sentCount} {sentCount === 1 ? 'uitnodiging' : 'uitnodigingen'} verstuurd
                  </span>
                ) : (
                  <span className="text-fg-2">
                    Klaar om te versturen:{' '}
                    <span className="font-medium text-fg-1">{pendingCount}</span>
                    {(invalidCount > 0 || dupCount > 0) && (
                      <span className="text-fg-3">
                        {' '}
                        · {invalidCount + dupCount} overgeslagen
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={clearAll} disabled={sending} className="text-fg-2">
                  <SvgIcon name="trash" size={13} />
                  Wissen
                </Button>
                <Button size="sm" onClick={send} disabled={sending || pendingCount === 0}>
                  {sending ? (
                    <>
                      <SvgIcon name="circle-notch" size={14} className="animate-spin" />
                      Versturen… ({sentCount}/{sendable.length})
                    </>
                  ) : done && pendingCount === 0 ? (
                    <>
                      <SvgIcon name="check" size={14} />
                      Klaar
                    </>
                  ) : (
                    <>
                      <SvgIcon name="user-plus-1" size={14} />
                      Verstuur {pendingCount} {pendingCount === 1 ? 'uitnodiging' : 'uitnodigingen'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </VariantShell>
  )
}
