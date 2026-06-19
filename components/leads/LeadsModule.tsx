'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { KanbanBoard } from '@/components/ui/KanbanBoard'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { LeadKaart } from './LeadKaart'
import { LeadsLijst } from './LeadsLijst'
import { NieuweLeadDrawer } from './NieuweLeadDrawer'
import type { Lead, LeadStatus } from '@/types/lead'
import type { TeamMember } from '@/types/team'
import { LEAD_COLUMNS } from '@/types/lead'
import { moveLead, setLeadAssignees } from '@/app/(app)/leads/actions'

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
  const [, startTransition]           = useTransition()
  const [localLeads, setLocalLeads]   = useState(initialLeads)

  function handleMoveLead(leadId: string, toStatus: string) {
    setLocalLeads((prev) => prev.map((l) =>
      l.id === leadId ? { ...l, status: toStatus as LeadStatus } : l,
    ))
    startTransition(() => { moveLead(leadId, toStatus) })
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
          />
        )}
      </div>

      <NieuweLeadDrawer
        key={`lead-${leadKey}`}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}
