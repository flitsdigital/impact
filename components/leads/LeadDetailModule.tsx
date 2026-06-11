'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusChip } from '@/components/ui/StatusChip'
import { DatePicker } from '@/components/ui/DatePicker'
import { PillSelect } from '@/components/ui/PillSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import type { Lead, LeadStatus, LeadContactmoment, ContactmomentType } from '@/types/lead'
import { LEAD_COLUMNS, BRON_LABEL, CONTACT_TYPE_CONFIG } from '@/types/lead'
import { updateLead, addContactmoment, deleteContactmoment } from '@/app/(app)/leads/actions'
import { fmtDate } from '@/lib/dates'
import { formatEur } from '@/lib/format'
import { LeadFormFields } from './LeadFormFields'

// ─── Bewerken-dialog ──────────────────────────────────────────────────────────

function EditDialog({
  lead,
  open,
  onOpenChange,
  onSaved,
}: {
  lead: Lead
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Krijgt de opgeslagen waarden terug zodat de pagina ze direct kan tonen */
  onSaved: (updates: Partial<Lead>) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const waardeRaw = data.get('waarde') as string
    const input: Partial<Lead> = {
      bedrijfsnaam:   data.get('bedrijfsnaam') as string,
      contactpersoon: (data.get('contactpersoon') as string) || null,
      email:          (data.get('email') as string) || null,
      telefoon:       (data.get('telefoon') as string) || null,
      bron:           data.get('bron') as Lead['bron'],
      waarde:         waardeRaw ? Number(waardeRaw) : null,
      notities:       (data.get('notities') as string) || null,
    }

    startTransition(async () => {
      const res = await updateLead(lead.id, input)
      if (res.error) {
        setError(res.error)
      } else {
        setError(null)
        onOpenChange(false)
        onSaved(input)
        toast('Lead bijgewerkt')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]" showCloseButton>
        <DialogHeader>
          <DialogTitle>Lead bewerken</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <LeadFormFields lead={lead} idPrefix="edit-lead-" />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending} variant="default">
              {isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Laat een textarea meegroeien met de inhoud (Notion-achtig document). */
function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// ─── Contactmomenten-sidebar ──────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ContactmomentForm({
  leadId,
  onAdded,
}: {
  leadId: string
  onAdded: (moment: LeadContactmoment) => void
}) {
  const [type, setType] = useState<ContactmomentType>('gebeld')
  const [datum, setDatum] = useState(() => todayStr())
  const [notitie, setNotitie] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await addContactmoment(leadId, { type, datum, notitie: notitie.trim() || null })
    setLoading(false)

    if (res.error) {
      toast(res.error)
    } else if (res.contactmoment) {
      onAdded(res.contactmoment)
      setNotitie('')
      setDatum(todayStr())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <PillSelect
          value={type}
          onChange={(v) => setType(v as ContactmomentType)}
          icon={CONTACT_TYPE_CONFIG[type].iconName}
        >
          {(Object.keys(CONTACT_TYPE_CONFIG) as ContactmomentType[]).map((t) => (
            <option key={t} value={t}>{CONTACT_TYPE_CONFIG[t].label}</option>
          ))}
        </PillSelect>
        <DatePicker
          value={datum}
          onChange={setDatum}
          variant="pill"
          clearable={false}
          aria-label="Datum contactmoment"
        />
      </div>
      <Input
        value={notitie}
        onChange={(e) => setNotitie(e.target.value)}
        placeholder="Korte notitie (optioneel)..."
        aria-label="Notitie contactmoment"
      />
      <Button type="submit" size="sm" disabled={loading} className="gap-1.5 self-end">
        <SvgIcon name="plus" size={13} />
        {loading ? 'Bezig...' : 'Toevoegen'}
      </Button>
    </form>
  )
}

function ContactmomentenSidebar({
  leadId,
  momenten,
  collapsed,
  onToggle,
  onAdded,
  onDelete,
}: {
  leadId: string
  momenten: LeadContactmoment[]
  collapsed: boolean
  onToggle: () => void
  onAdded: (moment: LeadContactmoment) => void
  onDelete: (momentId: string) => void
}) {
  if (collapsed) {
    return (
      <aside className="flex flex-col items-center gap-2 border-l border-border shrink-0 w-10 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Contactmomenten uitklappen"
          className="text-fg-3"
        >
          <SvgIcon name="chevrons-left" size={14} />
        </Button>
        <span
          className="text-[11px] font-medium text-fg-3 tracking-wide"
          style={{ writingMode: 'vertical-rl' }}
        >
          Contactmomenten
        </span>
        {momenten.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm bg-bg-3 text-[10px] text-fg-3">
            {momenten.length}
          </span>
        )}
      </aside>
    )
  }

  return (
    <aside className="flex flex-col border-l border-border shrink-0 w-[340px] min-h-0">
      {/* Sidebar header */}
      <div className="flex items-center justify-between pl-4 pr-2 py-2.5 border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-fg-1">Contactmomenten</span>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm bg-bg-3 text-[10px] text-fg-3">
            {momenten.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Contactmomenten inklappen"
          className="text-fg-3"
        >
          <SvgIcon name="chevrons-right" size={14} />
        </Button>
      </div>

      {/* Add form */}
      <div className="px-4 py-3 border-b border-border-subtle shrink-0">
        <ContactmomentForm leadId={leadId} onAdded={onAdded} />
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
        {momenten.length === 0 ? (
          <p className="text-[12px] text-fg-3 py-4 text-center">Nog geen contactmomenten.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {momenten.map((m) => {
              const cfg = CONTACT_TYPE_CONFIG[m.type]
              return (
                <li key={m.id} className="group flex items-start gap-2.5 py-2.5">
                  <SvgIcon name={cfg.iconName} size={13} className="text-fg-3 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-fg-1">{cfg.label}</span>
                      <span className="text-[11px] text-fg-3 tabular-nums">{fmtDate(m.datum)}</span>
                    </div>
                    {m.notitie && (
                      <p className="text-[12px] text-fg-2 whitespace-pre-wrap mt-0.5">{m.notitie}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(m.id)}
                    className="text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-label="Contactmoment verwijderen"
                  >
                    <SvgIcon name="trash" size={12} />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LeadDetailModuleProps {
  lead: Lead
  contactmomenten: LeadContactmoment[]
}

export function LeadDetailModule({ lead: initialLead, contactmomenten: initialMomenten }: LeadDetailModuleProps) {
  const router = useRouter()
  const [lead, setLead] = useState(initialLead)
  const [momenten, setMomenten] = useState(initialMomenten)
  const [editOpen, setEditOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [, startTransition] = useTransition()

  // Inline beschrijving (notities-veld) bewerken — zelfde patroon als projectdetail
  const [editingNotities, setEditingNotities] = useState(false)
  const [notitiesVal, setNotitiesVal] = useState(lead.notities ?? '')

  const statusCol = LEAD_COLUMNS.find((c) => c.status === lead.status)

  function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === lead.status) return
    setLead((l) => ({ ...l, status: newStatus }))
    startTransition(() => { updateLead(lead.id, { status: newStatus }) })
  }

  function handleNotitiesSave() {
    const next = notitiesVal.trim() || null
    setEditingNotities(false)
    if (next === (lead.notities ?? null)) return
    setLead((l) => ({ ...l, notities: next }))
    startTransition(() => { updateLead(lead.id, { notities: next }) })
  }

  function handleNotitiesCancel() {
    setNotitiesVal(lead.notities ?? '')
    setEditingNotities(false)
  }

  function handleMomentAdded(moment: LeadContactmoment) {
    setMomenten((prev) => [moment, ...prev])
  }

  function handleMomentDelete(momentId: string) {
    setMomenten((prev) => prev.filter((m) => m.id !== momentId))
    startTransition(() => { deleteContactmoment(momentId, lead.id) })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Breadcrumb bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/leads')}
            className="text-fg-3 shrink-0"
            aria-label="Terug naar leads"
          >
            <SvgIcon name="arrow-left" size={15} />
          </Button>

          <SvgIcon name="user-plus" size={14} className="text-fg-3 shrink-0" />
          <span className="text-[12px] text-fg-3">Leads</span>
          <SvgIcon name="chevron-right" size={10} className="text-fg-disabled shrink-0" />
          <span className="text-[12px] text-fg-1 font-medium truncate">{lead.bedrijfsnaam}</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
          <SvgIcon name="pencil" size={14} className="mr-1.5" />
          Bewerken
        </Button>
      </div>

      {/* ── Content + sidebar ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="w-full max-w-8/12 mx-auto min-h-full px-8 pt-6 pb-8 flex flex-col gap-3">

            {/* Title */}
            <h1 className="text-[28px] font-semibold text-fg-1 leading-tight">
              {lead.bedrijfsnaam}
            </h1>

            {/* ── Metadata row 1: status + bron + waarde ── */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Status — klik om te wijzigen */}
              {statusCol && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1 rounded hover:bg-bg-3 px-1 py-0.5 -mx-1 transition-colors outline-none"
                    title="Status wijzigen"
                  >
                    <StatusChip
                      iconName={statusCol.iconName}
                      label={statusCol.label}
                      textClass={statusCol.textClass}
                      iconSize={13}
                      labelClass="text-[12px] text-fg-2"
                    />
                    <SvgIcon name="caret-down" size={10} className="text-fg-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                    {LEAD_COLUMNS.map((col) => (
                      <DropdownMenuItem
                        key={col.status}
                        onSelect={() => handleStatusChange(col.status)}
                        className={cn(
                          'text-[12px]',
                          lead.status === col.status ? 'text-fg-1 font-medium' : 'text-fg-2',
                        )}
                      >
                        <SvgIcon name={col.iconName} size={13} className={col.textClass} />
                        {col.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Bron */}
              <div className="flex items-center gap-1.5">
                <SvgIcon name="signal-bars" size={13} className="text-fg-3" />
                <span className="text-[12px] text-fg-2">{BRON_LABEL[lead.bron]}</span>
              </div>

              {/* Waarde */}
              {lead.waarde != null && (
                <div className="flex items-center gap-1.5">
                  <SvgIcon name="coin-vertical" size={13} className="text-fg-3" />
                  <span className="text-[12px] text-fg-2 tabular-nums">{formatEur(lead.waarde)}</span>
                </div>
              )}

              {/* Aangemaakt */}
              <div className="flex items-center gap-1.5">
                <SvgIcon name="calendar" size={13} className="text-fg-3" />
                <span className="text-[12px] text-fg-2 tabular-nums">{fmtDate(lead.created_at)}</span>
              </div>
            </div>

            {/* ── Metadata row 2: contactgegevens ── */}
            <div className="flex items-center gap-4 flex-wrap">
              {lead.contactpersoon && (
                <div className="flex items-center gap-1.5">
                  <SvgIcon name="user" size={13} className="text-fg-3" />
                  <span className="text-[12px] text-fg-2">{lead.contactpersoon}</span>
                </div>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1.5 text-[12px] text-fg-2 hover:text-fg-1 transition-colors"
                >
                  <SvgIcon name="inbox" size={13} className="text-fg-3" />
                  {lead.email}
                </a>
              )}
              {lead.telefoon && (
                <a
                  href={`tel:${lead.telefoon}`}
                  className="flex items-center gap-1.5 text-[12px] text-fg-2 hover:text-fg-1 transition-colors"
                >
                  <SvgIcon name="user-clock" size={13} className="text-fg-3" />
                  {lead.telefoon}
                </a>
              )}
              {!lead.contactpersoon && !lead.email && !lead.telefoon && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1 text-[12px] text-fg-3 hover:text-fg-1 transition-colors"
                >
                  <SvgIcon name="plus" size={12} />
                  Contactgegevens toevoegen
                </button>
              )}
            </div>

            <div className="h-px bg-border-subtle shrink-0 my-2" />

            {/* ── Beschrijving — Notion-achtig document, vult de rest van de pagina ── */}
            {editingNotities ? (
              <textarea
                ref={(el) => {
                  if (!el) return
                  el.focus()
                  el.setSelectionRange(el.value.length, el.value.length)
                  autoGrow(el)
                }}
                value={notitiesVal}
                onChange={(e) => {
                  setNotitiesVal(e.target.value)
                  autoGrow(e.currentTarget)
                }}
                onBlur={handleNotitiesSave}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handleNotitiesCancel()
                  }
                }}
                placeholder="Schrijf een beschrijving, notities, of verzamel ideeën..."
                aria-label="Leadbeschrijving"
                className="flex-1 bg-transparent outline-none resize-none overflow-hidden text-[13px] leading-relaxed text-fg-1 placeholder:text-fg-3 w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingNotities(true)}
                className={cn(
                  'flex-1 text-[13px] leading-relaxed text-left w-full whitespace-pre-wrap transition-colors',
                  lead.notities ? 'text-fg-1' : 'text-fg-3 hover:text-fg-2',
                )}
                title="Beschrijving bewerken"
              >
                {lead.notities || 'Schrijf een beschrijving, notities, of verzamel ideeën...'}
              </button>
            )}
          </div>
        </div>

        {/* Contactmomenten-sidebar */}
        <ContactmomentenSidebar
          leadId={lead.id}
          momenten={momenten}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          onAdded={handleMomentAdded}
          onDelete={handleMomentDelete}
        />
      </div>

      {/* Bewerken-dialog */}
      <EditDialog
        lead={lead}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={(updates) => {
          setLead((l) => ({ ...l, ...updates }))
          setNotitiesVal(updates.notities ?? '')
          router.refresh()
        }}
      />
    </div>
  )
}
