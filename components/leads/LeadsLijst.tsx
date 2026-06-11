'use client'

import { StatusChip } from '@/components/ui/StatusChip'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Lead } from '@/types/lead'
import { LEAD_COLUMNS, BRON_LABEL } from '@/types/lead'
import { fmtDate } from '@/lib/dates'
import { formatEur } from '@/lib/format'

interface LeadsLijstProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}

export function LeadsLijst({ leads, onLeadClick }: LeadsLijstProps) {
  if (leads.length === 0) {
    return <EmptyState icon="user-plus" title="Geen leads gevonden." />
  }

  return (
    <div className="overflow-y-auto h-full px-6 py-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-border-subtle">
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide">Bedrijf</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-44">Contactpersoon</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-28">Status</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-24">Bron</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-28">Waarde</th>
            <th className="pb-2 text-[11px] text-fg-3 font-medium uppercase tracking-wide w-28">Aangemaakt</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const status = LEAD_COLUMNS.find((c) => c.status === lead.status)
            return (
              <tr
                key={lead.id}
                onClick={() => onLeadClick(lead)}
                className="border-b border-border-subtle/50 hover:bg-bg-2 cursor-pointer transition-colors"
              >
                <td className="py-2.5 pr-3 text-[13px] text-fg-1 max-w-[280px] truncate">{lead.bedrijfsnaam}</td>
                <td className="py-2.5 pr-3 text-[12px] text-fg-2 truncate">{lead.contactpersoon ?? '—'}</td>
                <td className="py-2.5 pr-3">
                  {status && (
                    <StatusChip
                      iconName={status.iconName}
                      label={status.label}
                      textClass={status.textClass}
                      className="text-[11px]"
                    />
                  )}
                </td>
                <td className="py-2.5 pr-3 text-[12px] text-fg-2">{BRON_LABEL[lead.bron]}</td>
                <td className="py-2.5 pr-3 text-[12px] text-fg-2 tabular-nums">
                  {lead.waarde != null ? formatEur(lead.waarde) : '—'}
                </td>
                <td className="py-2.5 text-[12px] text-fg-2 tabular-nums">{fmtDate(lead.created_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
