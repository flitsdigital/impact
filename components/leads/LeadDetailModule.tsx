'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card'
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
  onSaved: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const waardeRaw = data.get('waarde') as string
    const input = {
      bedrijfsnaam:   data.get('bedrijfsnaam') as string,
      contactpersoon: (data.get('contactpersoon') as string) || null,
      email:          (data.get('email') as string) || null,
      telefoon:       (data.get('telefoon') as string) || null,
      bron:           data.get('bron') as string,
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
        onSaved()
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

// ─── Contactmoment-formulier ──────────────────────────────────────────────────

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
      <div className="flex items-center gap-2">
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
      <div className="flex items-start gap-2">
        <Input
          value={notitie}
          onChange={(e) => setNotitie(e.target.value)}
          placeholder="Korte notitie (optioneel)..."
          aria-label="Notitie contactmoment"
        />
        <Button type="submit" size="sm" disabled={loading} className="gap-1.5 shrink-0 h-8">
          <SvgIcon name="plus" size={13} />
          {loading ? 'Bezig...' : 'Toevoegen'}
        </Button>
      </div>
    </form>
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
  const [, startTransition] = useTransition()

  const statusCol = LEAD_COLUMNS.find((c) => c.status === lead.status)

  function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === lead.status) return
    setLead((l) => ({ ...l, status: newStatus }))
    startTransition(() => { updateLead(lead.id, { status: newStatus }) })
  }

  function handleMomentAdded(moment: LeadContactmoment) {
    setMomenten((prev) => [moment, ...prev])
  }

  function handleMomentDelete(momentId: string) {
    setMomenten((prev) => prev.filter((m) => m.id !== momentId))
    startTransition(() => { deleteContactmoment(momentId, lead.id) })
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border shrink-0">
        <div className="flex items-center justify-between pl-8 pr-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/leads"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Terug naar leads"
            >
              <SvgIcon name="arrow-left" size={16} />
            </Link>
            <span className="text-sm font-medium text-foreground truncate">{lead.bedrijfsnaam}</span>

            {/* Status — klik om te wisselen */}
            {statusCol && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1 rounded-full hover:bg-bg-3 px-2 py-1 transition-colors outline-none"
                  title="Status wijzigen"
                >
                  <StatusChip
                    iconName={statusCol.iconName}
                    label={statusCol.label}
                    textClass={statusCol.textClass}
                    iconSize={13}
                    className="text-[12px]"
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
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <SvgIcon name="pencil" size={14} className="mr-1.5" />
              Bewerken
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* Leadgegevens */}
          <Card>
            <CardHeader>
              <CardTitle>Leadgegevens</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {lead.contactpersoon && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Contactpersoon</dt>
                    <dd className="font-medium">{lead.contactpersoon}</dd>
                  </div>
                )}
                {lead.email && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Email</dt>
                    <dd>
                      <a href={`mailto:${lead.email}`} className="text-foreground hover:underline">
                        {lead.email}
                      </a>
                    </dd>
                  </div>
                )}
                {lead.telefoon && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Telefoon</dt>
                    <dd>
                      <a href={`tel:${lead.telefoon}`} className="text-foreground hover:underline">
                        {lead.telefoon}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Bron</dt>
                  <dd>{BRON_LABEL[lead.bron]}</dd>
                </div>
                {lead.waarde != null && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Geschatte waarde</dt>
                    <dd className="font-medium tabular-nums">{formatEur(lead.waarde)}</dd>
                  </div>
                )}
                {!lead.contactpersoon && !lead.email && !lead.telefoon && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">
                      Nog geen contactgegevens.{' '}
                      <button
                        type="button"
                        onClick={() => setEditOpen(true)}
                        className="underline underline-offset-2 cursor-pointer"
                      >
                        Toevoegen
                      </button>
                    </p>
                  </div>
                )}
              </dl>
              {lead.notities && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-muted-foreground text-xs mb-1">Notities</p>
                  <p className="text-sm whitespace-pre-wrap">{lead.notities}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contactmomenten */}
          <Card>
            <CardHeader>
              <CardTitle>Contactmomenten</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ContactmomentForm leadId={lead.id} onAdded={handleMomentAdded} />

              {momenten.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nog geen contactmomenten.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {momenten.map((m) => {
                    const cfg = CONTACT_TYPE_CONFIG[m.type]
                    return (
                      <li key={m.id} className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <SvgIcon name={cfg.iconName} size={14} className="text-fg-3 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{cfg.label}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(m.datum)}</span>
                          </div>
                          {m.notitie && (
                            <p className="text-sm text-fg-2 whitespace-pre-wrap mt-0.5">{m.notitie}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleMomentDelete(m.id)}
                          className="text-fg-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          aria-label="Contactmoment verwijderen"
                        >
                          <SvgIcon name="trash" size={13} />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Bewerken-dialog */}
      <EditDialog
        lead={lead}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}
