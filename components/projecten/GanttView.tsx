// components/projecten/GanttView.tsx
'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { cn } from '@/lib/utils'
import type { Project, Milestone, ProjectStatus } from '@/types/project'

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS_VISIBLE = 6
const LABEL_COL_W   = 220  // pixels — must match inline style below

const MONTH_NL = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec']

// Status config matches PROJECT_COLUMNS in types/project.ts
const STATUS_CFG: Record<ProjectStatus, { icon: string; iconClass: string; barClass: string }> = {
  gepland:      { icon: 'circle-dashed', iconClass: 'text-fg-2',      barClass: 'bg-[rgba(145,145,147,0.3)] border border-[rgba(145,145,147,0.5)]' },
  bezig:        { icon: 'circle-notch',  iconClass: 'text-orange-500', barClass: 'bg-[rgba(251,146,60,0.3)]  border border-[rgba(251,146,60,0.5)]'  },
  feedback:     { icon: 'circle',        iconClass: 'text-blue-500',   barClass: 'bg-[rgba(96,165,250,0.3)]  border border-[rgba(96,165,250,0.5)]'  },
  klaar:        { icon: 'circle-check',  iconClass: 'text-green-500',  barClass: 'bg-[rgba(74,222,128,0.25)] border border-[rgba(74,222,128,0.45)]' },
  gearchiveerd: { icon: 'circle-dashed', iconClass: 'text-fg-3',       barClass: 'bg-[rgba(145,145,147,0.2)] border border-[rgba(145,145,147,0.3)]' },
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ProjectWithKlant = Project & { klanten?: { id: string; naam: string } | null }

interface DragState {
  projectId:       string
  startX:          number
  origStart:       string
  origDeadline:    string
  currentStart:    string
  currentDeadline: string
}

interface TooltipState {
  project: ProjectWithKlant
  x: number
  y: number
}

interface GanttViewProps {
  projects:      ProjectWithKlant[]
  milestones:    Milestone[]
  onDatesChange: (projectId: string, start: string | null, deadline: string | null) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)   // local midnight — DST-safe
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toPct(dateStr: string, rangeStart: Date, totalMs: number): number {
  return ((new Date(dateStr).getTime() - rangeStart.getTime()) / totalMs) * 100
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GanttView({ projects, milestones, onDatesChange }: GanttViewProps) {
  const router = useRouter()
  const [offsetMonths, setOffsetMonths] = useState(0)
  const [drag, setDrag]       = useState<DragState | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const wasDraggedRef = useRef(false)
  const isDragging = drag !== null

  // ── Timeline range ──────────────────────────────────────────────────────────

  const today = useMemo(() => new Date(), [])

  const months: Date[] = useMemo(() => {
    const pivot = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1)
    const first = new Date(pivot.getFullYear(), pivot.getMonth() - Math.floor(MONTHS_VISIBLE / 2), 1)
    return Array.from({ length: MONTHS_VISIBLE }, (_, i) =>
      new Date(first.getFullYear(), first.getMonth() + i, 1),
    )
  }, [today, offsetMonths])

  const rangeStart = useMemo(() => new Date(months[0].getFullYear(), months[0].getMonth(), 1), [months])
  const rangeEnd   = useMemo(() => endOfMonth(months[months.length - 1]), [months])
  const totalMs    = useMemo(() => rangeEnd.getTime() - rangeStart.getTime(), [rangeStart, rangeEnd])

  const todayPct = useMemo(
    () => toPct(toLocalDateStr(today), rangeStart, totalMs),
    [today, rangeStart, totalMs],
  )

  // ── Split projects ─────────────────────────────────────────────────────────

  const withDates    = useMemo(() => projects.filter(p => p.start_date && p.deadline), [projects])
  const withoutDates = useMemo(() => projects.filter(p => !p.start_date || !p.deadline), [projects])

  // ── Groups per klant ───────────────────────────────────────────────────────

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: ProjectWithKlant[] }>()
    for (const p of withDates) {
      const key   = p.klant_id ?? '__intern'
      const label = p.klanten?.naam ?? 'Intern'
      if (!map.has(key)) map.set(key, { key, label, items: [] })
      map.get(key)!.items.push(p)
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'nl'))
  }, [withDates])

  // ── Bar positioning ────────────────────────────────────────────────────────

  function barStyle(p: ProjectWithKlant): { left: string; width: string } | null {
    const start    = drag?.projectId === p.id ? drag.currentStart    : p.start_date
    const deadline = drag?.projectId === p.id ? drag.currentDeadline : p.deadline
    if (!start || !deadline) return null

    const leftPct  = toPct(start,    rangeStart, totalMs)
    const rightPct = toPct(deadline, rangeStart, totalMs)
    if (rightPct < 0 || leftPct > 100) return null

    return {
      left:  `${Math.max(0, leftPct)}%`,
      width: `${Math.max(0.5, Math.min(100, rightPct) - Math.max(0, leftPct))}%`,
    }
  }

  // ── Drag logic ─────────────────────────────────────────────────────────────

  const handleBarMouseDown = useCallback((e: React.MouseEvent, p: ProjectWithKlant) => {
    if (!p.start_date || !p.deadline) return
    e.preventDefault()
    e.stopPropagation()
    wasDraggedRef.current = false
    setTooltip(null)
    setDrag({
      projectId:       p.id,
      startX:          e.clientX,
      origStart:       p.start_date,
      origDeadline:    p.deadline,
      currentStart:    p.start_date,
      currentDeadline: p.deadline,
    })
  }, [])

  useEffect(() => {
    if (!isDragging) return

    function onMouseMove(e: MouseEvent) {
      setDrag(prev => {
        if (!prev || !trackRef.current) return prev
        const trackWidth = trackRef.current.getBoundingClientRect().width
        if (trackWidth === 0) return prev
        const totalDays = totalMs / 86_400_000
        const daysDelta = Math.round((e.clientX - prev.startX) / trackWidth * totalDays)
        if (Math.abs(e.clientX - prev.startX) > 4) {
          wasDraggedRef.current = true
        }
        return {
          ...prev,
          currentStart:    addDays(prev.origStart,    daysDelta),
          currentDeadline: addDays(prev.origDeadline, daysDelta),
        }
      })
    }

    function onMouseUp() {
      setDrag(prev => {
        if (prev) {
          const { projectId, currentStart, currentDeadline } = prev
          Promise.resolve().then(() => onDatesChange(projectId, currentStart, currentDeadline))
        }
        return null
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [isDragging, totalMs, onDatesChange])

  // ── Milestones per project ─────────────────────────────────────────────────

  const milestonesByProject = useMemo(() => {
    const map: Record<string, Milestone[]> = {}
    for (const m of milestones) {
      if (!m.datum) continue
      if (!map[m.project_id]) map[m.project_id] = []
      map[m.project_id].push(m)
    }
    return map
  }, [milestones])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden select-none">

      {/* ── Month header ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-border bg-bg-1">
        {/* Navigation + label column */}
        <div
          className="shrink-0 border-r border-border flex items-center gap-1 px-3"
          style={{ width: LABEL_COL_W }}
        >
          <button
            onClick={() => setOffsetMonths(o => o - 1)}
            className="p-1 rounded hover:bg-bg-3 text-fg-3 hover:text-fg-1 transition-colors"
            aria-label="Vorige maanden"
          >
            <SvgIcon name="chevron-left" size={11} />
          </button>
          <button
            onClick={() => setOffsetMonths(0)}
            className="text-[11px] text-fg-3 hover:text-fg-1 transition-colors px-1 rounded hover:bg-bg-3"
          >
            Nu
          </button>
          <button
            onClick={() => setOffsetMonths(o => o + 1)}
            className="p-1 rounded hover:bg-bg-3 text-fg-3 hover:text-fg-1 transition-colors"
            aria-label="Volgende maanden"
          >
            <SvgIcon name="chevron-right" size={11} />
          </button>
        </div>

        {/* Month labels + track anchor */}
        <div className="flex flex-1" ref={trackRef}>
          {months.map((m, i) => {
            const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth()
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 text-center py-2 text-[11px] font-medium border-r border-border/40',
                  isCurrent ? 'text-fg-1' : 'text-fg-3',
                )}
              >
                {MONTH_NL[m.getMonth()]}
                {m.getFullYear() !== today.getFullYear() && (
                  <span className="ml-1 opacity-60">{m.getFullYear()}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {groups.map(group => (
          <div key={group.key}>

            {/* Group header */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-bg-2/40 border-b border-border/50 sticky top-0 z-10">
              <span className="text-[11px] font-semibold text-fg-3 uppercase tracking-[0.06em]">
                {group.label}
              </span>
            </div>

            {/* Project rows */}
            {group.items.map(p => {
              const cfg        = STATUS_CFG[p.status]
              const bs         = barStyle(p)
              const isDragging = drag?.projectId === p.id

              return (
                <div
                  key={p.id}
                  className="flex items-center border-b border-border/30 hover:bg-bg-2/20"
                  style={{ height: 36 }}
                >
                  {/* Label column */}
                  <div
                    className="shrink-0 flex items-center gap-2 px-4 border-r border-border h-full"
                    style={{ width: LABEL_COL_W }}
                  >
                    <SvgIcon name={cfg.icon} size={12} className={cn(cfg.iconClass, 'shrink-0')} />
                    <span className="text-[12px] text-fg-1 font-medium truncate leading-none">
                      {p.naam}
                    </span>
                  </div>

                  {/* Track */}
                  <div className="relative flex-1 h-full">
                    {/* Month grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {months.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-border/15" />
                      ))}
                    </div>

                    {/* Today line */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-indigo-500/50 pointer-events-none z-10"
                        style={{ left: `${todayPct}%` }}
                      />
                    )}

                    {/* Bar */}
                    {bs && (
                      <div
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2 h-5 rounded flex items-center px-2',
                          'text-[11px] font-medium text-white/80 overflow-hidden whitespace-nowrap',
                          'cursor-grab active:cursor-grabbing transition-opacity',
                          cfg.barClass,
                          isDragging && 'opacity-75 shadow-md',
                        )}
                        style={bs}
                        onMouseDown={e => handleBarMouseDown(e, p)}
                        onMouseEnter={e => { if (!drag) setTooltip({ project: p, x: e.clientX, y: e.clientY }) }}
                        onMouseMove={e  => { if (!drag) setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null) }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return } router.push(`/projecten/${p.id}`) }}
                      >
                        {p.naam}
                      </div>
                    )}

                    {/* Milestone diamonds */}
                    {(milestonesByProject[p.id] ?? []).map(m => {
                      const pct = toPct(m.datum!, rangeStart, totalMs)
                      if (pct < 0 || pct > 100) return null
                      return (
                        <div
                          key={m.id}
                          title={m.naam}
                          className="absolute top-1/2 z-20 pointer-events-none"
                          style={{
                            left:        `${pct}%`,
                            width:       8,
                            height:      8,
                            marginTop:   -4,
                            marginLeft:  -4,
                            background:  m.voltooid ? '#4ade80' : 'rgba(226,226,228,0.85)',
                            transform:   'rotate(45deg)',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* ── Zonder planning ──────────────────────────────────────────────── */}
        {withoutDates.length > 0 && (
          <div className="border-t border-border mt-1">
            <div className="px-4 py-2 text-[11px] font-semibold text-fg-3 uppercase tracking-[0.06em]">
              Zonder planning
            </div>
            {withoutDates.map(p => {
              const cfg = STATUS_CFG[p.status]
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2 border-b border-border/30 hover:bg-bg-2/30 cursor-pointer"
                  onClick={() => router.push(`/projecten/${p.id}`)}
                >
                  <SvgIcon name={cfg.icon} size={12} className={cn(cfg.iconClass, 'shrink-0')} />
                  <span className="text-[12px] text-fg-1 font-medium">{p.naam}</span>
                  {p.klanten && (
                    <span className="text-[11px] text-fg-3">{p.klanten.naam}</span>
                  )}
                  <span className={cn('ml-auto text-[11px] px-2 py-0.5 rounded-full bg-bg-3', cfg.iconClass)}>
                    {p.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Tooltip ───────────────────────────────────────────────────────── */}
      {tooltip && !drag && (
        <div
          className="fixed z-50 pointer-events-none bg-bg-1 border border-border rounded-lg shadow-xl px-3 py-2"
          style={{ left: tooltip.x + 14, top: tooltip.y - 52 }}
        >
          <div className="text-[12px] font-semibold text-fg-1 mb-0.5">{tooltip.project.naam}</div>
          {tooltip.project.klanten && (
            <div className="text-[11px] text-fg-3 mb-1">{tooltip.project.klanten.naam}</div>
          )}
          <div className="text-[11px] text-fg-2">
            {tooltip.project.start_date ? fmtDate(tooltip.project.start_date) : '—'}
            {' → '}
            {tooltip.project.deadline ? fmtDate(tooltip.project.deadline) : '—'}
          </div>
        </div>
      )}

    </div>
  )
}
