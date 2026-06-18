'use client'

import * as React from 'react'
import { nl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { fmtDate, addDays, toLocalDateStr } from '@/lib/dates'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const PILL =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs text-secondary-foreground outline-none transition-colors hover:bg-bg-3'

function parseValue(v?: string): Date | undefined {
  if (!v) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d, 12) : undefined
}
const today = () => toLocalDateStr(new Date())
const label = (v: string) => fmtDate(v, { weekday: 'short', day: 'numeric', month: 'short' })

export function DateShortcutsPicker({ value, onChange, onOpenChange }: {
  value: string
  onChange: (v: string) => void
  /** Meldt open/dicht terug zodat de caller (TodoRow) z'n editors open kan houden. */
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpenRaw] = React.useState(false)
  const setOpen = (o: boolean) => { setOpenRaw(o); onOpenChange?.(o) }
  const pick = (v: string) => { onChange(v); setOpen(false) }
  const shortcuts = [
    { label: 'Vandaag', v: today() },
    { label: 'Morgen', v: addDays(today(), 1) },
    { label: 'Volgende week', v: addDays(today(), 7) },
  ]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(PILL, !value && 'text-fg-3')}>
        <SvgIcon name="calendar" size={12} />
        {value ? label(value) : 'Datum'}
      </PopoverTrigger>
      <PopoverContent align="start" className="pointer-events-auto w-auto gap-0 p-0">
        <div className="flex flex-col p-1.5">
          {shortcuts.map((s) => (
            <button key={s.label} onClick={() => pick(s.v)}
              className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] text-fg-1 hover:bg-bg-3">
              {s.label}<span className="text-[11px] text-fg-3">{label(s.v)}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-border-subtle">
          <Calendar mode="single" selected={parseValue(value)} defaultMonth={parseValue(value)}
            onSelect={(d) => d && pick(toLocalDateStr(d))} locale={nl} />
        </div>
        {value && (
          <button onClick={() => pick('')}
            className="w-full border-t border-border-subtle px-3 py-2 text-center text-xs text-fg-3 hover:text-fg-1">
            Wis datum
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
