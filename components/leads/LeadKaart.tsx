'use client'

import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import type { Lead } from '@/types/lead'
import { BRON_LABEL } from '@/types/lead'
import { formatEur } from '@/lib/format'

interface LeadKaartProps {
  lead:       Lead
  isDragging: boolean
  onClick?:   () => void
}

export function LeadKaart({ lead, isDragging, onClick }: LeadKaartProps) {
  const hasFooter = lead.bron !== 'overig' || lead.waarde != null

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
        'bg-bg-2 rounded p-2 flex flex-col gap-1.5 cursor-pointer hover:bg-bg-3 transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {/* Bedrijfsnaam */}
      <p className="text-[12px] font-medium text-fg-1 leading-snug line-clamp-2">
        {lead.bedrijfsnaam}
      </p>

      {/* Contactpersoon */}
      {lead.contactpersoon && (
        <div className="flex items-center gap-1.5 min-w-0">
          <SvgIcon name="user" size={11} className="text-fg-3 shrink-0" />
          <span className="text-[11px] text-fg-3 truncate">{lead.contactpersoon}</span>
        </div>
      )}

      {/* Footer: bron + waarde */}
      {hasFooter && (
        <>
          <div className="h-px bg-border-subtle" />
          <div className="flex items-center justify-between gap-2">
            {lead.bron !== 'overig' ? (
              <span className="text-[11px] text-fg-3">{BRON_LABEL[lead.bron]}</span>
            ) : <span />}
            {lead.waarde != null && (
              <span className="text-[11px] text-fg-2 font-medium tabular-nums">
                {formatEur(lead.waarde)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
