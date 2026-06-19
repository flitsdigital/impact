'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button, buttonVariants } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { KanbanBoard } from '@/components/ui/KanbanBoard'
import { SelectionBar } from '@/components/ui/SelectionBar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { LeadKaart } from './LeadKaart'
import { LeadsLijst } from './LeadsLijst'
import { NieuweLeadDrawer } from './NieuweLeadDrawer'
import type { Lead, LeadStatus, LeadBron } from '@/types/lead'
import type { TeamMember } from '@/types/team'
import { LEAD_COLUMNS, BRON_LABEL } from '@/types/lead'
import { updateLead, setLeadAssignees, bulkUpdateLeads, bulkDeleteLeads } from '@/app/(app)/leads/actions'

type View = 'kanban' | 'lijst'

const VIEWS: { value: View; icon: string; label: string }[] = [
  { value: 'kanban', icon: 'chart-kanban', label: 'Kanban' },
  { value: 'lijst',  icon: 'list-check',   label: 'Lijst' },
]

interface LeadsModuleProps {
  leads: Lead[]
  team:  TeamMember[]
}

export function LeadsModule({ leads: initialLeads, team }: LeadsModuleProps) {
  const router = useRouter()
  const [view, setView]               = useState<View>('kanban')
  const [searchQuery, setSearchQuery] = useState('')
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [leadKey, setLeadKey]         = useState(0)
  const [isPending, startTransition]  = useTransition()
  const [localLeads, setLocalLeads]   = useState(initialLeads)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Lijst met ids die op bevestiging wachten om verwijderd te worden; null = dialog dicht.
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null)

  function handleMoveLead(leadId: string, toStatus: string) {
    setLocalLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, status: toStatus as LeadStatus } : l,
    ))
    startTransition(() => { updateLead(leadId, { status: toStatus }) })
  }

  function handleCreated(lead: Lead) {
    setLocalLeads((prev) => [lead, ...prev])
  }

  function handleToggleAssignee(leadId: string, userId: string) {
    let nextIds: string[] = []
    setLocalLeads((prev) => prev.map((l) => {
      if (l.id !== leadId) return l
      const has = l.assignees.some((a) => a.id === userId)
      const assignees = has
        ? l.assignees.filter((a) => a.id !== userId)
        : [...l.assignees, team.find((t) => t.id === userId)!].filter(Boolean)
      nextIds = assignees.map((a) => a.id)
      return { ...l, assignees }
    }))
    startTransition(() => { setLeadAssignees(leadId, nextIds) })
  }

  function openNieuweLead() {
    setLeadKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() { setSelectedIds(new Set()) }

  function bulkUpdate(patch: { status?: LeadStatus; bron?: LeadBron }, msg: string) {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    // Optimistisch — spiegelt handleMoveLead (fire-and-forget).
    setLocalLeads((prev) => prev.map((l) => (selectedIds.has(l.id) ? { ...l, ...patch } : l)))
    clearSelection()
    startTransition(async () => {
      const res = await bulkUpdateLeads(ids, patch)
      if (res.error) { toast.error(res.error); return }
      toast(msg)
    })
  }

  function runDelete(ids: string[]) {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setLocalLeads((prev) => prev.filter((l) => !idSet.has(l.id)))
    clearSelection()
    setConfirmDelete(null)
    startTransition(async () => {
      const res = await bulkDeleteLeads(ids)
      if (res.error) { toast.error(res.error); return }
      toast(ids.length === 1 ? 'Lead verwijderd' : `${ids.length} leads verwijderd`)
    })
  }

  const filteredLeads = useMemo(() =>
    localLeads.filter((l) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        l.bedrijfsnaam.toLowerCase().includes(q) ||
        l.contactpersoon?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
      )
    }),
    [localLeads, searchQuery],
  )

  const isEmpty = localLeads.length === 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Leads"
        icon={<SvgIcon name="user-plus" size={16} className="text-fg-1 shrink-0" />}
        actions={
          <>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Zoek een lead..."
              ariaLabel="Zoek een lead"
            />
            <Button size="sm" onClick={openNieuweLead} className="gap-1.5">
              <SvgIcon name="user-plus" size={13} />
              Nieuwe lead
            </Button>
          </>
        }
        toolbar={
          <PageToolbar>
            <SegmentedControl options={VIEWS} value={view} onChange={setView} />
            <span className="ml-auto text-[12px] text-muted-foreground">
              {filteredLeads.length} leads
            </span>
          </PageToolbar>
        }
      />

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {isEmpty ? (
          <EmptyState
            icon="user-plus"
            title="Nog geen leads"
            description="Voeg je eerste lead toe om de pipeline te vullen."
            action={
              <Button size="sm" onClick={openNieuweLead} className="gap-1.5 mt-2">
                <SvgIcon name="user-plus" size={13} />
                Nieuwe lead
              </Button>
            }
          />
        ) : view === 'kanban' ? (
          <KanbanBoard
            columns={LEAD_COLUMNS.map((c) => ({ ...c, key: c.status }))}
            items={filteredLeads}
            getItemId={(l) => l.id}
            getColKey={(l) => l.status}
            renderCard={(lead, isDragging) => (
              <LeadKaart
                lead={lead}
                isDragging={isDragging}
                team={team}
                onToggleAssignee={(userId) => handleToggleAssignee(lead.id, userId)}
                onClick={() => router.push(`/leads/${lead.id}`)}
              />
            )}
            onMove={handleMoveLead}
            onAddItem={openNieuweLead}
            addItemLabel="Nieuwe lead"
          />
        ) : (
          <LeadsLijst
            leads={filteredLeads}
            onLeadClick={(lead) => router.push(`/leads/${lead.id}`)}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={() =>
              setSelectedIds((prev) =>
                filteredLeads.length > 0 && filteredLeads.every((l) => prev.has(l.id))
                  ? new Set()
                  : new Set(filteredLeads.map((l) => l.id)),
              )
            }
            onDeleteOne={(id) => setConfirmDelete([id])}
          />
        )}
      </div>

      <NieuweLeadDrawer
        key={`lead-${leadKey}`}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={handleCreated}
      />

      {view === 'lijst' && (
        <SelectionBar count={selectedIds.size} onClear={clearSelection} label="leads geselecteerd">
          {/* Status wijzigen */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))} disabled={isPending}>
              <SvgIcon name="signal-bars" size={13} />
              Status
              <SvgIcon name="chevron-down" size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Status wijzigen</DropdownMenuLabel>
              {LEAD_COLUMNS.map((c) => (
                <DropdownMenuItem key={c.status} onSelect={() => bulkUpdate({ status: c.status }, 'Status bijgewerkt')}>
                  <SvgIcon name={c.iconName} size={13} className={c.textClass} />
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bron wijzigen */}
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))} disabled={isPending}>
              <SvgIcon name="filter" size={13} />
              Bron
              <SvgIcon name="chevron-down" size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Bron wijzigen</DropdownMenuLabel>
              {(Object.keys(BRON_LABEL) as LeadBron[]).map((bron) => (
                <DropdownMenuItem key={bron} onSelect={() => bulkUpdate({ bron }, 'Bron bijgewerkt')}>
                  {BRON_LABEL[bron]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-0.5 h-5 w-px bg-border-subtle" />

          <Button variant="destructive" size="sm" disabled={isPending} onClick={() => setConfirmDelete([...selectedIds])}>
            <SvgIcon name="trash" size={14} />
            Verwijderen
          </Button>
        </SelectionBar>
      )}

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-[420px]" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.length === 1 ? 'Lead verwijderen?' : `${confirmDelete?.length ?? 0} leads verwijderen?`}
            </DialogTitle>
            <DialogDescription>
              Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={() => runDelete(confirmDelete ?? [])}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
