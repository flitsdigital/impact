'use client'

import { useState, useMemo, useTransition } from 'react'
import { X, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { setProjectAssignees } from '@/app/(app)/projecten/actions'
import type { ProjectAssigneeProfile } from '@/types/project'
import type { TeamMember } from '@/types/team'

interface AssigneesModalProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  projectId:     string
  assignees:     ProjectAssigneeProfile[]
  teamMembers:   TeamMember[]
  onAssigneesChange: (assignees: ProjectAssigneeProfile[]) => void
}

export function AssigneesModal({
  open,
  onOpenChange,
  projectId,
  assignees,
  teamMembers,
  onAssigneesChange,
}: AssigneesModalProps) {
  const currentIds = assignees.map((a) => a.profile_id)
  const [selected, setSelected] = useState<Set<string>>(new Set(currentIds))
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [, startTransition]     = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return teamMembers
    return teamMembers.filter(
      (m) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q),
    )
  }, [teamMembers, search])

  if (!open) return null

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const ids = Array.from(selected)

    // Build new assignees list for optimistic update
    const newAssignees: ProjectAssigneeProfile[] = teamMembers
      .filter((m) => selected.has(m.id))
      .map((m) => ({
        profile_id: m.id,
        profiles: {
          id:         m.id,
          full_name:  m.full_name,
          avatar_url: m.avatar_url,
          email:      m.email,
        },
      }))

    onAssigneesChange(newAssignees)
    onOpenChange(false)

    startTransition(async () => {
      await setProjectAssignees(projectId, ids)
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm bg-bg-1 rounded-xl border border-border shadow-2xl flex flex-col max-h-[70vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="text-[14px] font-semibold text-fg-1">Verantwoordelijken</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Sluiten"
            className="text-fg-3"
          >
            <X size={15} />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2 bg-bg-2 rounded px-3 h-8">
            <Search size={13} className="text-fg-3 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek teamlid..."
              autoFocus
              className="flex-1 bg-transparent text-[12px] text-fg-1 placeholder:text-fg-disabled outline-none"
            />
          </div>
        </div>

        {/* Team member list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-fg-disabled text-center py-6">Geen teamleden gevonden.</p>
          ) : (
            filtered.map((member) => {
              const isSelected = selected.has(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggle(member.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-2',
                    isSelected && 'bg-bg-2',
                  )}
                >
                  <Avatar
                    src={member.avatar_url}
                    name={member.full_name ?? undefined}
                    size={28}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-fg-1 truncate">{member.full_name ?? member.email}</p>
                    {member.full_name && member.email && (
                      <p className="text-[11px] text-fg-3 truncate">{member.email}</p>
                    )}
                  </div>
                  <div className={cn(
                    'size-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-border-subtle',
                  )}>
                    {isSelected && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0">
          <span className="text-[11px] text-fg-3">
            {selected.size} geselecteerd
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              Opslaan
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
