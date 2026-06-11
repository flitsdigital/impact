'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { toggleInvoiceRecord, cycleFactuurStatus } from '@/app/(app)/timeline/actions'
import type { KlantBilling, ComputedInvoice, FactuurStatus } from '@/types/factuur'
import { FACTUUR_STATUS_NEXT } from '@/types/factuur'
import { formatEur } from '@/lib/format'
import { FactuurStatusBadge } from './FactuurStatusBadge'
// ─── Layout constants ─────────────────────────────────────────────────────────

const LEFT_W = 240   // px – sticky client label column
const WEEK_W = 70    // px – each week column
const DAY_W = WEEK_W / 7   // ≈ 10px per day
const ROW_H = 57    // px – each client row
const HDR_MONTH_H = 47    // px – month name header height
const HDR_WEEK_H = 28    // px – week number row height
const BAR_H = 18    // px – contract bar height
const DOT_R = 5     // px – dot radius (diameter = 10px)

// ─── Dutch locale ─────────────────────────────────────────────────────────────

const MONTHS_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000)
}

function toDateStr(d: Date): string {
  // Use local date parts — toISOString() converts to UTC, shifting the date
  // back in UTC+ timezones (e.g. Netherlands UTC+2) causing off-by-one errors.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + n)
  return out
}

function getISOWeek(d: Date): number {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const jan4 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(
    ((date.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
  )
}

// ─── Invoice date calculation ─────────────────────────────────────────────────

function calcRecurringDates(klant: KlantBilling, until: Date): string[] {
  const startStr = klant.contract_start_date
  if (!startStr || !klant.billing_cycle) return []

  const start = new Date(startStr + 'T00:00:00')
  const endD = klant.contract_end_date
    ? new Date(klant.contract_end_date + 'T00:00:00')
    : until

  const dates: string[] = []
  let cur = new Date(start)

  while (cur <= until && cur <= endD) {
    dates.push(toDateStr(cur))
    switch (klant.billing_cycle) {
      case '4_weeks': cur.setDate(cur.getDate() + 28); break
      case '6_weeks': cur.setDate(cur.getDate() + 42); break
      case 'monthly': cur = addMonths(cur, 1); break           // F8: real calendar months
      case 'custom': cur.setDate(cur.getDate() + (klant.custom_cycle_days ?? 30)); break
    }
  }
  return dates
}

// ─── Computed invoices per klant ──────────────────────────────────────────────

function getComputedInvoices(klant: KlantBilling, until: Date): ComputedInvoice[] {
  if (klant.type === 'recurring') {
    const dates = calcRecurringDates(klant, until)
    return dates.map((dateStr) => {
      const rec = klant.invoice_records.find((r) => r.date === dateStr)
      return {
        date: new Date(dateStr + 'T00:00:00'),
        dateStr,
        invoiced: rec?.invoiced ?? false,
        invoicedAt: rec?.invoiced_at ?? null,
        amount: klant.price_per_cycle ?? 0,
      }
    })
  }

  // project / one-off: use klant_facturen milestones
  return (klant.klant_facturen ?? []).map((f) => ({
    date: new Date(f.due_date + 'T00:00:00'),
    dateStr: f.due_date,
    invoiced: f.status === 'paid',
    invoicedAt: f.paid_at,
    amount: f.amount,
    factuurId: f.id,
    factuurStatus: f.status,
    label: f.label,
  }))
}

// ─── Dot color ────────────────────────────────────────────────────────────────

function dotColor(inv: ComputedInvoice, today: Date): string {
  const isPast = inv.date < today
  const daysAway = diffDays(inv.date, today)

  if (isPast) {
    // For project/oneoff use status-based coloring
    if (inv.factuurStatus) {
      if (inv.factuurStatus === 'paid') return '#22c55e'
      if (inv.factuurStatus === 'sent') return '#f97316'
      return '#ef4444'   // planned/overdue and in past
    }
    return inv.invoiced ? '#22c55e' : '#ef4444'
  }
  if (inv.factuurStatus === 'sent') return '#f97316'
  if (daysAway <= 7) return '#f97316'   // orange — this week
  return '#3b82f6'                        // blue — future
}

// ─── Bar color ────────────────────────────────────────────────────────────────

function barColor(klant: KlantBilling, invoices: ComputedInvoice[], today: Date): string {
  if (klant.status === 'gepauzeerd') return '#374151'

  const overdueUnpaid = invoices.some(
    (inv) => inv.date < today && !inv.invoiced && inv.factuurStatus !== 'sent' && inv.factuurStatus !== 'paid',
  )
  if (overdueUnpaid) return '#7f1d1d'  // dark red

  const soonDue = invoices.some(
    (inv) => diffDays(inv.date, today) >= 0 && diffDays(inv.date, today) <= 7,
  )
  if (soonDue) return '#7c2d12'  // dark orange

  return '#14532d'  // dark green
}

// ─── Tooltip state ────────────────────────────────────────────────────────────

interface TooltipInfo {
  x: number; y: number
  klantNaam: string
  dateStr: string
  weekNum: number
  amount: number
  invoiced: boolean
  invoicedAt: string | null
  factuurStatus?: FactuurStatus
  label?: string
  klantId: string
  isRecurring: boolean
}

// ─── Mobile invoice row ───────────────────────────────────────────────────────

function MobileRow({ inv, klant, today, onToggle }: {
  inv: ComputedInvoice
  klant: KlantBilling
  today: Date
  onToggle: () => void
}) {
  const color = dotColor(inv, today)
  const isPast = inv.date < today

  const dateLabel = inv.date.toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/20">
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{klant.naam}</p>
        {inv.label && <p className="text-xs text-muted-foreground truncate">{inv.label}</p>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{dateLabel}</span>
      <span className="text-xs font-medium text-foreground shrink-0">
        {formatEur(inv.amount)}
      </span>
      {klant.type === 'recurring' && isPast && (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'shrink-0 text-xs px-2 py-1 rounded-md border transition-colors',
            inv.invoiced
              ? 'border-green-800 text-green-500 hover:bg-green-900/20'
              : 'border-border text-muted-foreground hover:text-foreground hover:border-ring',
          )}
        >
          {inv.invoiced ? 'Gefactureerd' : 'Markeren'}
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  klanten: KlantBilling[]
}

export function FacturatieTijdlijn({ klanten: initialKlanten }: Props) {
  const [klanten, setKlanten] = useState(initialKlanten)
  useEffect(() => setKlanten(initialKlanten), [initialKlanten])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'actief' | 'gepauzeerd'>('all')
  const [horizon, setHorizon] = useState<26 | 52>(26)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [confirmUnmark, setConfirmUnmark] = useState<{ klantId: string; dateStr: string } | null>(null)
  const [, startTransition] = useTransition()

  const scrollRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const TODAY = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])

  // Timeline starts 4 weeks before today (so we can see recent past)
  const timelineStart = useMemo(() => {
    const d = new Date(TODAY); d.setDate(d.getDate() - 28); return getMonday(d)
  }, [TODAY])

  const totalWeeks = horizon

  // All weeks in the timeline
  const weeks = useMemo(() => {
    const result: { date: Date; weekNum: number }[] = []
    const cursor = new Date(timelineStart)
    for (let i = 0; i < totalWeeks; i++) {
      result.push({ date: new Date(cursor), weekNum: getISOWeek(cursor) })
      cursor.setDate(cursor.getDate() + 7)
    }
    return result
  }, [timelineStart, totalWeeks])

  // Group weeks by month (for month header row)
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; count: number; startIdx: number }[] = []
    weeks.forEach((w, i) => {
      const key = `${w.date.getFullYear()}-${w.date.getMonth()}`
      const last = groups[groups.length - 1]
      if (last?.key === key) { last.count++ }
      else groups.push({ key, label: `${MONTHS_NL[w.date.getMonth()]} ${w.date.getFullYear()}`, count: 1, startIdx: i })
    })
    return groups
  }, [weeks])

  const timelineEnd = useMemo(() => {
    const d = new Date(timelineStart); d.setDate(d.getDate() + totalWeeks * 7); return d
  }, [timelineStart, totalWeeks])

  // Today's x position (within timeline area, i.e. excluding LEFT_W)
  const todayX = useMemo(() => {
    const days = diffDays(TODAY, timelineStart)
    return Math.max(0, days * DAY_W)
  }, [TODAY, timelineStart])

  // Current week index (for highlight)
  const todayWeekIdx = useMemo(() => {
    return weeks.findIndex((w) => {
      const end = new Date(w.date); end.setDate(end.getDate() + 7)
      return TODAY >= w.date && TODAY < end
    })
  }, [weeks, TODAY])

  // Filtered klanten
  const filtered = useMemo(() => {
    let list = klanten
    if (statusFilter !== 'all') list = list.filter((k) => k.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((k) => k.naam.toLowerCase().includes(q))
    }
    return list
  }, [klanten, statusFilter, search])

  // Auto-scroll to today on mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const viewW = el.clientWidth - LEFT_W
    el.scrollLeft = Math.max(0, todayX - viewW * 0.2)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function scrollToToday() {
    const el = scrollRef.current
    if (!el) return
    const viewW = el.clientWidth - LEFT_W
    el.scrollTo({ left: Math.max(0, todayX - viewW * 0.2), behavior: 'smooth' })
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = scrollRef.current
      if (!el) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 't' || e.key === 'T') { scrollToToday(); return }
      if (e.key === 'ArrowLeft') { el.scrollLeft -= (e.shiftKey ? WEEK_W * 4 : WEEK_W); e.preventDefault() }
      if (e.key === 'ArrowRight') { el.scrollLeft += (e.shiftKey ? WEEK_W * 4 : WEEK_W); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [todayX]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle invoiced (recurring) ─────────────────────────────────────────────

  function handleToggle(klantId: string, dateStr: string, currentInvoiced: boolean) {
    // Un-marking is destructive → vraag eerst om bevestiging via een dialog.
    if (currentInvoiced) {
      setTooltip(null)
      setConfirmUnmark({ klantId, dateStr })
      return
    }
    applyToggle(klantId, dateStr, currentInvoiced)
  }

  function applyToggle(klantId: string, dateStr: string, currentInvoiced: boolean) {
    const newVal = !currentInvoiced

    // Optimistic update
    setKlanten((prev) => prev.map((k) => {
      if (k.id !== klantId) return k
      const records = k.invoice_records ?? []
      const existing = records.find((r) => r.date === dateStr)
      const updated = existing
        ? records.map((r) => r.date === dateStr ? { ...r, invoiced: newVal, invoiced_at: newVal ? new Date().toISOString() : null } : r)
        : [...records, { date: dateStr, invoiced: newVal, invoiced_at: newVal ? new Date().toISOString() : null }]
      return { ...k, invoice_records: updated }
    }))

    setTooltip(null)

    startTransition(async () => {
      await toggleInvoiceRecord(klantId, dateStr, newVal)
    })

    if (newVal) {
      toast('Gemarkeerd als gefactureerd', {
        duration: 5000,
        action: {
          label: 'Ongedaan maken',
          onClick: () => handleToggle(klantId, dateStr, newVal),
        },
      })
    }
  }

  // ── Cycle factuur status (project/oneoff) ───────────────────────────────────

  function handleCycleStatus(factuurId: string, klantId: string, currentStatus: FactuurStatus) {
    const newStatus = FACTUUR_STATUS_NEXT[currentStatus]

    setKlanten((prev) => prev.map((k) => {
      if (k.id !== klantId) return k
      return {
        ...k,
        klant_facturen: k.klant_facturen.map((f) =>
          f.id === factuurId
            ? {
              ...f, status: newStatus,
              sent_at: newStatus === 'sent' ? new Date().toISOString() : f.sent_at,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : f.paid_at
            }
            : f,
        ),
      }
    }))
    setTooltip(null)
    startTransition(() => { cycleFactuurStatus(factuurId, currentStatus) })
  }

  // ── Month totals ─────────────────────────────────────────────────────────────

  const monthTotals = useMemo(() => {
    return monthGroups.map((mg) => {
      const weekStart = new Date(weeks[mg.startIdx].date)
      const weekEnd = new Date(weeks[Math.min(mg.startIdx + mg.count - 1, weeks.length - 1)].date)
      weekEnd.setDate(weekEnd.getDate() + 7)

      let total = 0
      let allInvoiced = true
      let hasAny = false

      for (const k of filtered) {
        const invs = getComputedInvoices(k, timelineEnd)
        for (const inv of invs) {
          if (inv.date >= weekStart && inv.date < weekEnd) {
            total += inv.amount
            hasAny = true
            if (!inv.invoiced && inv.factuurStatus !== 'paid') allInvoiced = false
          }
        }
      }

      return { key: mg.key, label: mg.label, total, allInvoiced, hasAny, count: mg.count }
    })
  }, [monthGroups, filtered, weeks, timelineEnd])

  // ─────────────────────────────────────────────────────────────────────────────

  const totalW = LEFT_W + totalWeeks * WEEK_W

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      <PageHeader
        title="Facturatie tijdlijn"
        iconName="chart-gantt"
        actions={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Zoek een klant"
            />
            <Button size="sm">
              <SvgIcon name="user-plus" size={14} />
              Klant toevoegen
            </Button>
          </>
        }
        toolbar={
          <PageToolbar className="flex-wrap">
            <div className="flex items-center gap-2">
              <LegendPill color="#ef4444" bg="#3c1618" label="Verlopen" />
              <LegendPill color="#f97316" bg="#331b00" label="Binnenkort" />
              <LegendPill color="#22c55e" bg="#0f2e18" label="Voldaan" />
              <LegendPill color="#6b7280" bg="#1f1f1f" label="Toekomstig" />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <SegmentedControl
                options={[
                  { value: 'all', label: 'Alle' },
                  { value: 'actief', label: 'Actief' },
                  { value: 'gepauzeerd', label: 'Gepauzeerd' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />

              <SegmentedControl
                options={[
                  { value: '26', label: '26w' },
                  { value: '52', label: '52w' },
                ]}
                value={String(horizon) as '26' | '52'}
                onChange={(v) => setHorizon(Number(v) as 26 | 52)}
              />

              <Button variant="ghost" size="xs" onClick={scrollToToday} className="gap-1.5">
                <SvgIcon name="calendar" size={12} />
                Vandaag
              </Button>
            </div>
          </PageToolbar>
        }
      />

      {/* ── Mobile view ────────────────────────────────────────────────────── */}
      <div className="md:hidden flex-1 overflow-auto">
        {(() => {
          const items: { inv: ComputedInvoice; klant: KlantBilling }[] = []
          for (const k of filtered) {
            const invs = getComputedInvoices(k, timelineEnd)
            for (const inv of invs) items.push({ inv, klant: k })
          }
          items.sort((a, b) => a.inv.date.getTime() - b.inv.date.getTime())
          if (items.length === 0) return (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm p-8">
              Geen factuurmomenten gevonden.
            </div>
          )
          return items.map(({ inv, klant }) => (
            <MobileRow
              key={`${klant.id}-${inv.dateStr}`}
              inv={inv} klant={klant} today={TODAY}
              onToggle={() => handleToggle(klant.id, inv.dateStr, inv.invoiced)}
            />
          ))
        })()}
      </div>

      {/* ── Desktop timeline ────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="hidden md:block flex-1 overflow-auto"
        onMouseLeave={() => setTooltip(null)}
      >
        <div style={{ minWidth: totalW, position: 'relative' }}>

          {/* ── Sticky header ──────────────────────────────────────────────── */}
          <div
            style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', background: 'var(--color-bg-1)' }}
            className="border-b border-border"
          >
            {/* Corner cell */}
            <div
              style={{ position: 'sticky', left: 0, zIndex: 30, width: LEFT_W, background: 'var(--color-bg-1)' }}
              className="border-r border-b border-border flex flex-col"
            >
              {/* Top row: client count */}
              <div style={{ height: HDR_MONTH_H }} className="flex items-center px-8 border-b border-border">
                <span className="text-xs text-muted-foreground">
                  Totaal: {filtered.length} klant{filtered.length !== 1 ? 'en' : ''}
                </span>
              </div>
              {/* Bottom row: month totals legend */}
              <div style={{ height: HDR_WEEK_H }} className="flex items-center px-8">
                <span className="text-[11px] text-muted-foreground/50">omzet / maand</span>
              </div>
            </div>

            {/* Month + week headers + totals */}
            <div style={{ flex: 1 }}>
              {/* Month names + totals */}
              <div style={{ display: 'flex', height: HDR_MONTH_H }}>
                {monthGroups.map((mg, mi) => {
                  const tot = monthTotals[mi]
                  return (
                    <div
                      key={mg.key}
                      style={{ width: mg.count * WEEK_W }}
                      className="border-l border-b border-border flex items-center justify-between px-4 shrink-0"
                    >
                      <span className="text-sm font-semibold text-foreground truncate">{mg.label}</span>
                      {tot.hasAny && (
                        <span className={cn(
                          'text-[11px] font-medium shrink-0 ml-2',
                          tot.allInvoiced ? 'text-green-500' : 'text-orange-400',
                        )}>
                          {formatEur(tot.total)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Week numbers */}
              <div style={{ display: 'flex', height: HDR_WEEK_H }}>
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    style={{ width: WEEK_W }}
                    className={cn(
                      'border-l border-b border-border flex items-center px-2 shrink-0',
                      i === todayWeekIdx && 'bg-white/[0.06]',
                    )}
                  >
                    <span className="text-xs text-muted-foreground">W{w.weekNum}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Rows area ──────────────────────────────────────────────────── */}
          <div style={{ position: 'relative' }}>

            {/* Today vertical line */}
            {todayX >= 0 && todayX <= totalWeeks * WEEK_W && (
              <div style={{
                position: 'absolute',
                left: LEFT_W + todayX,
                top: 0,
                bottom: 0,
                width: 1,
                background: '#ef4444',
                zIndex: 5,
                pointerEvents: 'none',
              }} />
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{ height: 200 }} className="flex items-center justify-center text-muted-foreground text-sm">
                Geen klanten gevonden.
              </div>
            )}

            {/* Client rows */}
            {filtered.map((klant) => {
              const invoices = getComputedInvoices(klant, timelineEnd)
              const bColor = barColor(klant, invoices, TODAY)

              // Contract bar bounds
              const cStart = klant.contract_start_date
                ? new Date(klant.contract_start_date + 'T00:00:00')
                : timelineStart
              const cEnd = klant.contract_end_date
                ? new Date(klant.contract_end_date + 'T00:00:00')
                : timelineEnd

              const barStartX = Math.max(0, diffDays(cStart, timelineStart) * DAY_W)
              const barEndX = Math.min(totalWeeks * WEEK_W, diffDays(cEnd, timelineStart) * DAY_W)
              const barWidth = Math.max(0, barEndX - barStartX)

              return (
                <div
                  key={klant.id}
                  style={{ display: 'flex', height: ROW_H }}
                  className="border-b border-border"
                >
                  {/* Sticky label */}
                  <div
                    style={{ position: 'sticky', left: 0, zIndex: 10, width: LEFT_W, background: 'var(--color-bg-1)' }}
                    className="flex flex-col justify-center px-8 border-r border-border shrink-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">{klant.naam}</span>
                      {klant.status === 'gepauzeerd' && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                          gepauzeerd
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      {klant.price_per_cycle != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatEur(klant.price_per_cycle)}
                        </span>
                      )}
                      {klant.project_budget != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatEur(klant.project_budget)}
                        </span>
                      )}
                      {(() => {
                        const upcoming = invoices
                          .filter((inv) => inv.date >= TODAY)
                          .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
                        if (!upcoming) return null
                        const days = diffDays(upcoming.date, TODAY)
                        const label = days === 0 ? 'vandaag' : days === 1 ? 'morgen' : `over ${days} d`
                        return (
                          <span className="text-[11px] text-muted-foreground/60 truncate">
                            · {label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Timeline area */}
                  <div style={{ position: 'relative', width: totalWeeks * WEEK_W, height: ROW_H }}>
                    {/* Week background cells */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
                      {weeks.map((_, i) => (
                        <div
                          key={i}
                          style={{ width: WEEK_W, height: '100%', borderLeft: '1px solid var(--color-border)' }}
                          className={cn(
                            i % 2 === 0 ? 'bg-white/[0.005]' : 'bg-white/[0.015]',
                            i === todayWeekIdx && 'bg-white/[0.06]',
                          )}
                        />
                      ))}
                    </div>

                    {/* Contract bar */}
                    {barWidth > 0 && (
                      <div style={{
                        position: 'absolute',
                        left: barStartX,
                        width: barWidth,
                        height: BAR_H,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: bColor,
                        borderRadius: 4,
                        zIndex: 1,
                        pointerEvents: 'none',
                      }} />
                    )}

                    {/* Invoice dots */}
                    {invoices.map((inv) => {
                      const x = diffDays(inv.date, timelineStart) * DAY_W
                      if (x < 0 || x > totalWeeks * WEEK_W) return null

                      const isPast = inv.date < TODAY
                      const color = dotColor(inv, TODAY)

                      return (
                        <div
                          key={inv.dateStr}
                          style={{
                            position: 'absolute',
                            left: x - DOT_R,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: DOT_R * 2,
                            height: DOT_R * 2,
                            borderRadius: '50%',
                            background: color,
                            zIndex: 3,
                            cursor: isPast && klant.type === 'recurring' ? 'pointer'
                              : klant.type !== 'recurring' ? 'pointer' : 'default',
                            border: '2px solid var(--color-bg-1)',
                          }}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            setTooltip({
                              x: rect.left + DOT_R,
                              y: rect.top,
                              klantNaam: klant.naam,
                              dateStr: inv.dateStr,
                              weekNum: getISOWeek(inv.date),
                              amount: inv.amount,
                              invoiced: inv.invoiced,
                              invoicedAt: inv.invoicedAt,
                              factuurStatus: inv.factuurStatus,
                              label: inv.label,
                              klantId: klant.id,
                              isRecurring: klant.type === 'recurring',
                            })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => {
                            if (klant.type === 'recurring' && isPast) {
                              handleToggle(klant.id, inv.dateStr, inv.invoiced)
                            } else if (inv.factuurId) {
                              handleCycleStatus(inv.factuurId, klant.id, inv.factuurStatus ?? 'planned')
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tooltip ─────────────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            zIndex: 50,
            pointerEvents: 'none',
          }}
          className="bg-bg-0 border border-border rounded-lg shadow-xl px-3 py-2.5 flex flex-col gap-1 min-w-[180px] max-w-[240px]"
        >
          <p className="text-sm font-semibold text-foreground">{tooltip.klantNaam}</p>
          {tooltip.label && (
            <p className="text-xs text-muted-foreground">{tooltip.label}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <SvgIcon name="calendar" size={11} />
            <span>
              {new Date(tooltip.dateStr + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' '}· W{tooltip.weekNum}
            </span>
          </div>
          <p className="text-xs font-medium text-foreground">{formatEur(tooltip.amount)}</p>
          {tooltip.factuurStatus ? (
            <FactuurStatusBadge status={tooltip.factuurStatus} />
          ) : tooltip.invoiced ? (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <SvgIcon name="check" size={11} />
              Gefactureerd
              {tooltip.invoicedAt && (
                <span className="text-muted-foreground">
                  · {new Date(tooltip.invoicedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-red-500">Nog niet gefactureerd</p>
          )}
        </div>
      )}

      {/* Bevestiging bij het verwijderen van een facturatie-markering */}
      <Dialog open={!!confirmUnmark} onOpenChange={(o) => { if (!o) setConfirmUnmark(null) }}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Markering verwijderen?</DialogTitle>
            <DialogDescription>
              Wil je de facturatie-markering voor deze datum verwijderen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmUnmark(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmUnmark) applyToggle(confirmUnmark.klantId, confirmUnmark.dateStr, true)
                setConfirmUnmark(null)
              }}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function LegendPill({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <div
      style={{ background: bg }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-foreground"
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </div>
  )
}
