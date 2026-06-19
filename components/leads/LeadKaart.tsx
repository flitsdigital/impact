'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { Lead } from '@/types/lead'
import type { TeamMember } from '@/types/team'
import { DIENST_CONFIG, LEAD_COLUMNS } from '@/types/lead'
import { formatEur } from '@/lib/format'
import { fmtRelative } from '@/lib/dates'

const STATUS_BY = Object.fromEntries(LEAD_COLUMNS.map((c) => [c.status, c]))

interface LeadKaartProps {
  lead:             Lead
  isDragging:       boolean
  team:             TeamMember[]
  onToggleAssignee: (userId: string) => void
  onClick?:         () => void
}

export function LeadKaart({ lead, isDragging, team, onToggleAssignee, onClick }: LeadKaartProps) {
  const dienst = lead.dienst ? DIENST_CONFIG[lead.dienst] : null
  const status = STATUS_BY[lead.status]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'bg-bg-2 rounded-lg p-3 flex flex-col gap-2.5 cursor-pointer hover:bg-bg-3 transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {/* Bovenrij: dienst-type · waarde + toegewezen teamleden */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {dienst ? (
          <span className="flex items-center gap-1.5 min-w-0 text-fg-3">
            <SvgIcon name={dienst.iconName} size={14} className="shrink-0" />
            <span className="text-[12px] font-medium truncate">{dienst.label}</span>
          </span>
        ) : <span />}

        <div className="flex items-center gap-2.5 shrink-0">
          {lead.waarde != null && (
            <span className="text-[13px] text-fg-2 font-medium tabular-nums">
              {formatEur(lead.waarde)}
            </span>
          )}
          {/* Klik op de toewijzen-knop mag de kaart niet openen */}
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <AssigneeDropdown
              compact
              value={lead.assignees.map((a) => a.id)}
              team={team}
              onToggle={onToggleAssignee}
            />
          </span>
        </div>
      </div>

      {/* Titel met status-icoon */}
      <div className="flex items-center gap-2 min-w-0">
        {status && (
          <SvgIcon name={status.iconName} size={16} className={cn('shrink-0', status.textClass)} />
        )}
        <p className="text-[15px] font-semibold text-fg-1 leading-snug truncate">
          {lead.bedrijfsnaam}
        </p>
      </div>

      {/* Aangemaakt */}
      <span className="text-[12px] text-fg-3">{fmtRelative(lead.created_at)}</span>
    </div>
  )
}
