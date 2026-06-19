'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { DrawerClose } from '@/components/ui/Drawer'
import {
  AppDrawer,
  AppDrawerHeader,
  AppDrawerMeta,
  AppDrawerBody,
  AppDrawerFooter,
} from '@/components/ui/AppDrawer'
import { PillSelect } from '@/components/ui/PillSelect'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { cn } from '@/lib/utils'
import { fmtDate, toLocalDateStr } from '@/lib/dates'
import { bulkSchedulePosts } from '@/app/(app)/content/actions'
import type { Klant } from '@/types/klant'

// Alleen foto/video zijn afwisselbaar in deze flow.
type SlotType = 'foto' | 'video'
type Brush = SlotType | 'afwisselend' | 'gum'

// getDay()-index: 0 = zo … 6 = za. UI begint bij maandag.
const WEEKDAYS: { idx: number; short: string }[] = [
  { idx: 1, short: 'ma' }, { idx: 2, short: 'di' }, { idx: 3, short: 'wo' },
  { idx: 4, short: 'do' }, { idx: 5, short: 'vr' }, { idx: 6, short: 'za' }, { idx: 0, short: 'zo' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  klanten: Pick<Klant, 'id' | 'naam'>[]
}

export function ContentPlannenDrawer({ open, onOpenChange, klanten }: Props) {
  const today = toLocalDateStr(new Date())
  const [klantId, setKlantId] = useState('')
  const [brush, setBrush] = useState<Brush>('afwisselend')
  const [painted, setPainted] = useState<Record<string, SlotType>>({})
  const [monthOffset, setMonthOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const drag = useRef<null | 'paint' | 'erase'>(null)
  const lastCell = useRef<string | null>(null)
  const gated = !klantId

  // Reset bij sluiten.
  useEffect(() => {
    if (!open) {
      setKlantId(''); setBrush('afwisselend'); setPainted({}); setMonthOffset(0); setError(null)
    }
  }, [open])

  // Sleep om te vegen: stop zodra de pointer ergens loslaat.
  useEffect(() => {
    const stop = () => { drag.current = null; lastCell.current = null }
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const base = new Date(today + 'T12:00:00')
  const months = [0, 1].map((off) => {
    const d = new Date(base.getFullYear(), base.getMonth() + monthOffset + off, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const slots = useMemo(
    () => Object.entries(painted).map(([date, type]) => ({ date, type })).sort((a, b) => a.date.localeCompare(b.date)),
    [painted],
  )

  function alternatingTypeFor(dateStr: string, current: Record<string, SlotType>): SlotType {
    const dates = [...Object.keys(current), dateStr].sort()
    return dates.indexOf(dateStr) % 2 === 0 ? 'foto' : 'video'
  }

  function paint(dateStr: string) {
    if (gated) return
    setPainted((prev) => {
      const next = { ...prev }
      if (brush === 'gum') delete next[dateStr]
      else if (brush === 'afwisselend') next[dateStr] = alternatingTypeFor(dateStr, prev)
      else next[dateStr] = brush
      return next
    })
  }

  function erase(dateStr: string) {
    if (gated) return
    setPainted((prev) => {
      if (!prev[dateStr]) return prev
      const next = { ...prev }
      delete next[dateStr]
      return next
    })
  }

  function applyStroke(dateStr: string) {
    drag.current === 'erase' ? erase(dateStr) : paint(dateStr)
  }

  // Datum van de cel onder de cursor — werkt ook als een cel de pointer "vangt".
  function cellAt(x: number, y: number): string | null {
    return document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-date]')?.dataset.date ?? null
  }

  // Indrukken = veeg starten (rechtermuisknop gumt, anders verven).
  function onGridPointerDown(e: React.PointerEvent) {
    const ds = (e.target as HTMLElement).closest<HTMLElement>('[data-date]')?.dataset.date
    if (!ds) return
    e.preventDefault()
    drag.current = e.button === 2 ? 'erase' : 'paint'
    lastCell.current = ds
    applyStroke(ds)
  }

  // Slepen met de knop ingedrukt = doorvegen over elke nieuwe cel.
  function onGridPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const ds = cellAt(e.clientX, e.clientY)
    if (!ds || ds === lastCell.current) return
    lastCell.current = ds
    applyStroke(ds)
  }

  function fillWeekday(weekdayIdx: number) {
    if (gated) return
    const targets: string[] = []
    for (const { y, m } of months) {
      const days = new Date(y, m + 1, 0).getDate()
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d)
        const ds = toLocalDateStr(date)
        if (date.getDay() === weekdayIdx && ds >= today) targets.push(ds)
      }
    }
    setPainted((prev) => {
      const next = { ...prev }
      targets.sort().forEach((ds, i) => {
        if (brush === 'gum') delete next[ds]
        else if (brush === 'afwisselend') next[ds] = i % 2 === 0 ? 'foto' : 'video'
        else next[ds] = brush
      })
      return next
    })
  }

  const fotoCount = slots.filter((s) => s.type === 'foto').length

  function handlePlan() {
    if (gated || slots.length === 0) return
    setError(null)
    startTransition(async () => {
      const res = await bulkSchedulePosts({ klant_id: klantId, slots })
      if (res.error) setError(res.error)
      else onOpenChange(false)
    })
  }

  return (
    <AppDrawer open={open} onOpenChange={onOpenChange} title="Content plannen" width={680}>
      <div className="flex h-full flex-col">
        <AppDrawerHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <SvgIcon name="calendar" size={14} />
            <span className="text-sm font-medium text-foreground">Content plannen</span>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon-sm" type="button" className="text-muted-foreground">
              <SvgIcon name="x" size={14} />
            </Button>
          </DrawerClose>
        </AppDrawerHeader>

        <AppDrawerMeta>
          {/* Klant */}
          <PillSelect value={klantId} onChange={setKlantId} icon="users">
            <option value="">Kies een klant…</option>
            {klanten.map((k) => (
              <option key={k.id} value={k.id}>{k.naam}</option>
            ))}
          </PillSelect>

          {/* Kwast */}
          <div className={cn(gated && 'pointer-events-none opacity-40')}>
            <SegmentedControl
              value={brush}
              onChange={(v) => setBrush(v as Brush)}
              options={[
                { value: 'foto', label: 'Foto', icon: 'image-square' },
                { value: 'video', label: 'Video', icon: 'video' },
                { value: 'afwisselend', label: 'Afwisselend', icon: 'arrows-sort' },
                { value: 'gum', label: 'Gum', icon: 'x' },
              ]}
            />
          </div>
        </AppDrawerMeta>

        <AppDrawerBody>
          {/* Snel vullen */}
          <div className={cn('flex flex-wrap items-center gap-1.5', gated && 'pointer-events-none opacity-40')}>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Snel vullen:</span>
            {WEEKDAYS.map((d) => (
              <Button key={d.idx} variant="outline" size="xs" className="capitalize" onClick={() => fillWeekday(d.idx)}>
                elke {d.short}
              </Button>
            ))}
          </div>

          {/* Maand-navigatie */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon-sm" disabled={monthOffset === 0}
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))} aria-label="Vorige maand">
              <SvgIcon name="chevron-left" size={14} />
            </Button>
            <span className="text-xs text-muted-foreground">
              {fmtDate(toLocalDateStr(new Date(months[0].y, months[0].m, 1)), { month: 'long', year: 'numeric' })}
              {' – '}
              {fmtDate(toLocalDateStr(new Date(months[1].y, months[1].m, 1)), { month: 'long' })}
            </span>
            <Button variant="outline" size="icon-sm"
              onClick={() => setMonthOffset((o) => o + 1)} aria-label="Volgende maand">
              <SvgIcon name="chevron-right" size={14} />
            </Button>
          </div>

          {/* Kalenders */}
          <div className="relative">
            <div className={cn('grid touch-none select-none gap-6 sm:grid-cols-2', gated && 'opacity-40')}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={onGridPointerDown}
              onPointerMove={onGridPointerMove}>
              {months.map(({ y, m }) => (
                <MonthGrid key={`${y}-${m}`} year={y} month={m} today={today} painted={painted} disabled={gated} />
              ))}
            </div>
            {gated && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-bg-2 px-3 py-1.5 text-xs text-muted-foreground">
                  Kies eerst een klant om te plannen
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tip: klik en sleep om in één veeg te vullen · <span className="text-fg-2">rechtermuisknop = gummen</span>
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </AppDrawerBody>

        <AppDrawerFooter>
          <span className="mr-auto text-xs text-muted-foreground">
            {slots.length === 0
              ? 'Nog niets gepland'
              : `${slots.length} posts · ${fotoCount}× foto · ${slots.length - fotoCount}× video`}
          </span>
          <DrawerClose asChild>
            <Button variant="outline" size="sm" type="button">Annuleren</Button>
          </DrawerClose>
          <Button size="sm" className="gap-1.5" disabled={gated || slots.length === 0 || isPending} onClick={handlePlan}>
            <SvgIcon name="calendar" size={13} />
            {isPending ? 'Plannen…' : `Plannen${slots.length ? ` (${slots.length})` : ''}`}
          </Button>
        </AppDrawerFooter>
      </div>
    </AppDrawer>
  )
}

function MonthGrid({
  year, month, today, painted, disabled,
}: {
  year: number
  month: number
  today: string
  painted: Record<string, SlotType>
  disabled: boolean
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7 // maandag = 0
  const title = fmtDate(toLocalDateStr(new Date(year, month, 1)), { month: 'long', year: 'numeric' })

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium capitalize text-foreground">{title}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((d) => (
          <span key={d} className="pb-1 text-[10px] uppercase text-muted-foreground">{d}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const ds = toLocalDateStr(new Date(year, month, day))
          const type = painted[ds]
          const past = ds < today
          const off = past || disabled
          return (
            <button
              key={ds}
              type="button"
              disabled={off}
              data-date={off ? undefined : ds}
              className={cn(
                'relative flex aspect-square touch-none items-center justify-center rounded-md text-[12px] tabular-nums transition-colors',
                past && 'cursor-not-allowed text-fg-disabled',
                !off && !type && 'bg-bg-2 text-fg-2 hover:bg-bg-3',
                !past && disabled && !type && 'bg-bg-2 text-fg-2',
                type === 'foto' && 'bg-blue-500/20 text-blue-500',
                type === 'video' && 'bg-purple-500/20 text-purple-500',
              )}
            >
              {day}
              {type && (
                <SvgIcon name={type === 'foto' ? 'image-square' : 'video'} size={10} className="absolute bottom-1 right-1" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
