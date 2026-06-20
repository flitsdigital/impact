'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/Table'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'
import { StatusChip } from '@/components/ui/StatusChip'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { MobileListCard } from '@/components/ui/MobileListCard'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types/lead'
import { LEAD_COLUMNS, BRON_LABEL } from '@/types/lead'
import { fmtDate } from '@/lib/dates'
import { formatEur } from '@/lib/format'

interface LeadsLijstProps {
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  /** Selectie inschakelen: aanwezigheid hiervan toont de checkbox-kolom + kebab. */
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
  onDeleteOne?: (id: string) => void
}

export function LeadsLijst({
  leads,
  onLeadClick,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onDeleteOne,
}: LeadsLijstProps) {
  const [sortAsc, setSortAsc] = useState<boolean | null>(null)

  const selectable = !!onToggleSelect
  const allSelected = selectable && leads.length > 0 && leads.every((l) => selectedIds?.has(l.id))
  const colSpan = selectable ? 8 : 6

  const sorted = sortAsc === null
    ? leads
    : [...leads].sort((a, b) => {
        const cmp = a.bedrijfsnaam.localeCompare(b.bedrijfsnaam)
        return sortAsc ? cmp : -cmp
      })

  return (
    <>
      {/* ── Kaarten (telefoon) ───────────────────────────────────────────── */}
      <div className="md:hidden flex-1 overflow-y-auto min-h-0 flex flex-col gap-2 p-3">
        {sorted.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">Geen leads gevonden.</p>
        )}
        {sorted.map((lead) => {
          const status = LEAD_COLUMNS.find((c) => c.status === lead.status)
          const isSelected = selectedIds?.has(lead.id) ?? false
          return (
            <MobileListCard
              key={lead.id}
              onClick={() => onLeadClick(lead)}
              selected={isSelected}
              leading={
                selectable ? (
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(lead.id)} />
                ) : undefined
              }
              trailing={
                selectable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Acties"
                    >
                      <SvgIcon name="ellipsis" size={16} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onSelect={() => onDeleteOne?.(lead.id)}>
                        <SvgIcon name="trash" size={13} />
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[14px] font-medium text-foreground">{lead.bedrijfsnaam}</span>
                {lead.waarde != null && (
                  <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
                    {formatEur(lead.waarde)}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                {status && (
                  <StatusChip
                    iconName={status.iconName}
                    label={status.label}
                    textClass={status.textClass}
                    className="text-xs"
                  />
                )}
                <span className="text-[12px] text-muted-foreground">· {BRON_LABEL[lead.bron]}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                {lead.contactpersoon && <span className="truncate">{lead.contactpersoon}</span>}
                <span className="shrink-0 tabular-nums">· {fmtDate(lead.created_at)}</span>
              </span>
            </MobileListCard>
          )
        })}
      </div>

      {/* ── Table (tablet/desktop) ──────────────────────────────────────── */}
      <div className="hidden md:block flex-1 overflow-auto min-h-0">
      <table
        className="w-full border-separate border-spacing-0 text-sm"
        style={{ minWidth: 900 }}
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent border-0">
            {selectable && (
              <TableHead className="sticky left-0 z-20 bg-background pl-8 pr-4 w-[60px] border-b border-border">
                <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll?.()} />
              </TableHead>
            )}
            <TableHead className={cn(
              'sticky z-20 bg-background pr-4 border-b border-border',
              selectable ? 'left-[60px]' : 'left-0 pl-8',
            )}>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSortAsc((p) => (p === null ? true : !p))}
                className="px-0 text-muted-foreground hover:text-foreground font-medium"
              >
                Bedrijf
                <SvgIcon name="arrows-sort" data-icon="inline-end" />
              </Button>
            </TableHead>
            <TableHead className="w-[180px] border-b border-border font-medium text-muted-foreground">
              Contactpersoon
            </TableHead>
            <TableHead className="w-[150px] border-b border-border font-medium text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="w-[130px] border-b border-border font-medium text-muted-foreground">
              Bron
            </TableHead>
            <TableHead className="w-[140px] border-b border-border font-medium text-muted-foreground">
              Waarde
            </TableHead>
            <TableHead className={cn(
              'w-[170px] pl-4 border-b border-border font-medium text-muted-foreground',
              selectable ? 'pr-4' : 'pr-8',
            )}>
              Aangemaakt
            </TableHead>
            {selectable && <TableHead className="w-[56px] pr-8 border-b border-border" />}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.length === 0 && (
            <TableRow className="hover:bg-transparent border-0">
              <TableCell colSpan={colSpan} className="py-16 text-center text-muted-foreground">
                Geen leads gevonden.
              </TableCell>
            </TableRow>
          )}
          {sorted.map((lead) => {
            const status = LEAD_COLUMNS.find((c) => c.status === lead.status)
            const isSelected = selectedIds?.has(lead.id) ?? false

            return (
              <TableRow
                key={lead.id}
                data-state={isSelected ? 'selected' : undefined}
                className="border-0"
              >
                {selectable && (
                  <TableCell className={cn(
                    'sticky left-0 z-10 pl-8 pr-4 border-b border-border transition-colors',
                    isSelected ? 'bg-muted' : 'bg-background',
                  )}>
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(lead.id)} />
                  </TableCell>
                )}
                {/* Frozen: bedrijf */}
                <TableCell className={cn(
                  'sticky z-10 pr-4 border-b border-border transition-colors',
                  selectable ? 'left-[60px]' : 'left-0 pl-8',
                  isSelected ? 'bg-muted' : 'bg-background',
                )}>
                  <button
                    onClick={() => onLeadClick(lead)}
                    className="text-sm font-medium text-foreground hover:underline text-left"
                  >
                    {lead.bedrijfsnaam}
                  </button>
                </TableCell>
                {/* Contactpersoon */}
                <TableCell className="border-b border-border text-muted-foreground">
                  {lead.contactpersoon ?? <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                {/* Status */}
                <TableCell className="border-b border-border">
                  {status && (
                    <StatusChip
                      iconName={status.iconName}
                      label={status.label}
                      textClass={status.textClass}
                      className="text-xs"
                    />
                  )}
                </TableCell>
                {/* Bron */}
                <TableCell className="border-b border-border text-muted-foreground">
                  {BRON_LABEL[lead.bron]}
                </TableCell>
                {/* Waarde */}
                <TableCell className="border-b border-border tabular-nums">
                  {lead.waarde != null ? (
                    <span className="font-medium">{formatEur(lead.waarde)}</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                {/* Aangemaakt */}
                <TableCell className={cn(
                  'pl-4 border-b border-border text-muted-foreground tabular-nums',
                  selectable ? 'pr-4' : 'pr-8',
                )}>
                  {fmtDate(lead.created_at)}
                </TableCell>
                {/* Rij-acties */}
                {selectable && (
                  <TableCell className="pr-8 border-b border-border text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground"
                        aria-label="Acties"
                      >
                        <SvgIcon name="ellipsis" size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onSelect={() => onDeleteOne?.(lead.id)}>
                          <SvgIcon name="trash" size={13} />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </table>
      </div>
    </>
  )
}
