'use client'

import { Fragment, useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { KanbanBoard } from '@/components/ui/KanbanBoard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusChip } from '@/components/ui/StatusChip'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { NieuwePostDrawer } from './NieuwePostDrawer'
import { ContentPlannenDrawer } from './ContentPlannenDrawer'
import { updatePostStatus, reorderPostInDay } from '@/app/(app)/content/actions'
import type { Post, PostStatus, PostType } from '@/types/post'
import { STATUS_ICON, STATUS_LABEL, STATUS_ORDER } from '@/types/post'
import type { Klant } from '@/types/klant'
import type { TeamMember } from '@/types/team'
import { fmtDate, parseDate, toLocalDateStr } from '@/lib/dates'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PostStatus, {
  label: string
  textClass: string
  iconName: string
}> = {
  te_doen: { label: STATUS_LABEL.te_doen, textClass: 'text-muted-foreground', iconName: STATUS_ICON.te_doen },
  bezig: { label: STATUS_LABEL.bezig, textClass: 'text-orange-500', iconName: STATUS_ICON.bezig },
  klaar_voor_feedback: { label: STATUS_LABEL.klaar_voor_feedback, textClass: 'text-blue-500', iconName: STATUS_ICON.klaar_voor_feedback },
  akkoord: { label: STATUS_LABEL.akkoord, textClass: 'text-purple-500', iconName: STATUS_ICON.akkoord },
  gepost: { label: STATUS_LABEL.gepost, textClass: 'text-green-500', iconName: STATUS_ICON.gepost },
}

const TYPE_CONFIG: Record<PostType, { label: string; iconName: string }> = {
  foto: { label: 'Foto', iconName: 'image-square' },
  video: { label: 'Video', iconName: 'video' },
  reel: { label: 'Reel', iconName: 'reel' },        // no icon → red circle
  carousel: { label: 'Carousel', iconName: 'layout-grid' },
}

const VIEWS = [
  { value: 'maand' as const, label: 'Maand', icon: 'calendar' },
  { value: 'week' as const, label: 'Week', icon: 'layout-columns' },
  { value: 'lijst' as const, label: 'Lijst', icon: 'list-check' },
  { value: 'kanban' as const, label: 'Kanban', icon: 'chart-kanban' },
]

type View = 'maand' | 'week' | 'lijst' | 'kanban'

const DAYS_NL_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAYS_NL_LONG = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
const MONTHS_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function getWeekDays(date: Date): Date[] {
  const mon = getMonday(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

function getMonthCalendar(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = getMonday(first)
  const weeks: Date[][] = []
  const cursor = new Date(start)
  while (cursor <= last || weeks.length < 4) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) { week.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1) }
    weeks.push(week)
    if (weeks.length >= 6) break
  }
  return weeks
}

// Volgorde binnen een dag: posities eerst, null (ongeordend) achteraan. Ties houden
// de invoervolgorde (= query-volgorde op created_at) dankzij stabiele JS-sort.
// Belangrijk: gelijk → 0 teruggeven, niet Infinity-Infinity=NaN (NaN maakt sort
// ongedefinieerd en husselt de volgorde).
function byPosition(a: Post, b: Post): number {
  const pa = a.position ?? Infinity
  const pb = b.position ?? Infinity
  return pa === pb ? 0 : pa - pb
}

function groupByDate(posts: Post[]): Map<string, Post[]> {
  const map = new Map<string, Post[]>()
  for (const p of posts) {
    if (!p.scheduled_at) continue
    const key = p.scheduled_at.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  for (const list of map.values()) list.sort(byPosition)
  return map
}

function formatDateNL(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('nl-NL', opts ?? { day: 'numeric', month: 'short' })
}

// ─── Drag types ───────────────────────────────────────────────────────────────

interface DragState {
  postId: string
  fromKey: string                   // date (week) or status (kanban)
  type: 'week' | 'kanban'
}

interface DragHandlers {
  draggingPostId: string | null
  dragOverKey: string | null
  dropIndex: number | null          // insert-positie binnen de dag waar overheen gesleept wordt
  onPostDragStart: (postId: string, fromKey: string, type: 'week' | 'kanban') => void
  onPostDragEnd: () => void
  onZoneDragOver: (e: React.DragEvent, key: string) => void
  onCardDragOver: (e: React.DragEvent, key: string, index: number) => void  // index op basis van boven/onderhelft
  onZoneDrop: (e: React.DragEvent, key: string) => void
  onZoneDragLeave: (e: React.DragEvent) => void
}

// Grijze invoeg-indicator tussen posts tijdens het slepen (volgt het ring-thema).
function DropLine() {
  return <div className="h-0.5 rounded-full bg-border-strong" />
}

// ─── StatusIcon ───────────────────────────────────────────────────────────────

function StatusIcon({ status, size = 12 }: { status: PostStatus; size?: number }) {
  const cfg = STATUS_CONFIG[status]
  return <SvgIcon name={cfg.iconName} size={size} className={cfg.textClass} />
}

// ─── TypeIcon ─────────────────────────────────────────────────────────────────

function TypeIcon({ type, size = 12 }: { type: PostType; size?: number }) {
  return (
    <SvgIcon
      name={TYPE_CONFIG[type].iconName}
      size={size}
      className="text-muted-foreground"
    />
  )
}

// ─── StatusSelect ─────────────────────────────────────────────────────────────

function StatusSelect({ postId, current }: { postId: string; current: PostStatus }) {
  const [, startTrans] = useTransition()
  const cfg = STATUS_CONFIG[current]

  return (
    <span className="relative inline-flex items-center gap-1">
      <StatusIcon status={current} size={10} />
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as PostStatus
          startTrans(() => { updatePostStatus(postId, next, current) })
        }}
        className={cn(
          'appearance-none bg-transparent border-0 outline-none cursor-pointer text-xs pr-2',
          cfg.textClass,
        )}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
    </span>
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post: Post
  isDragging?: boolean
  hideDate?: boolean        // week-view: dag staat al in de kolomkop, datum is overbodig
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onClick?: () => void
}

function PostCard({ post, isDragging = false, hideDate = false, onDragStart, onDragEnd, onDragOver, onClick }: PostCardProps) {
  const dateLabel = !hideDate && post.scheduled_at ? fmtDate(post.scheduled_at) : null
  const assignees = post.assignees ?? []

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={onClick}
      className={cn(
        'bg-bg-4 rounded-sm p-2 flex flex-col gap-1.5 cursor-pointer hover:bg-bg-3 transition-colors select-none',
        isDragging && 'opacity-40',
      )}
    >
      {/* Row 1: type label + avatar stack */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TypeIcon type={post.type} size={14} />
          {TYPE_CONFIG[post.type].label}
        </span>

        {assignees.length > 0 ? (
          <AvatarStack
            people={assignees.map((a) => ({ key: a.id, src: a.avatar_url, name: a.full_name ?? undefined }))}
            size={14}
            overlap={4}
          />
        ) : (
          dateLabel && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{dateLabel}</span>
        )}
      </div>

      {/* Row 2: status + klant + date (when avatars are shown) */}
      <div className="flex items-center gap-1.5">
        <StatusIcon status={post.status} size={16} />
        <span className="text-sm text-foreground truncate flex-1">{post.klant_naam ?? '—'}</span>
        {assignees.length > 0 && dateLabel && (
          <span className="text-xs text-muted-foreground shrink-0">{dateLabel}</span>
        )}
      </div>
    </div>
  )
}

// ─── MaandView ────────────────────────────────────────────────────────────────

function MaandView({ posts, currentDate, onAdd, drag, onEdit, onOpenWeek }: {
  posts: Post[]
  currentDate: Date
  onAdd: (date?: string) => void
  drag: DragHandlers
  onEdit: (post: Post) => void
  onOpenWeek: (dateKey: string) => void
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weeks = getMonthCalendar(year, month)
  const byDate = groupByDate(posts)
  const today = toLocalDateStr(new Date())

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Day headers */}
      <div className="bg-bg-2 grid grid-cols-7 border-b border-border shrink-0">
        {DAYS_NL_SHORT.map((d) => (
          <div key={d} className="px-3 py-2 text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Weeks — flex-1 so rows share all remaining height equally */}
      <div className="flex flex-col flex-1 overflow-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0 flex-1 min-h-[80px]">
            {week.map((day) => {
              const key = toLocalDateStr(day)
              const dayPosts = byDate.get(key) ?? []
              const inMonth = day.getMonth() === month
              const isToday = key === today
              const isOver = drag.dragOverKey === key
              // Past in een rij van vaste hoogte: 3 posts, of 2 posts + ghost als er meer zijn.
              const visible = dayPosts.length > 3 ? dayPosts.slice(0, 2) : dayPosts
              const overflow = dayPosts.length - visible.length

              return (
                <div
                  key={key}
                  className={cn(
                    'border-r border-border last:border-r-0 p-2 flex flex-col gap-0.5 group overflow-hidden transition-[opacity,box-shadow,background-color] duration-200 ease-strong',
                    !inMonth && 'opacity-35',
                    isOver && 'ring-2 ring-inset ring-border-strong bg-bg-3',
                  )}
                  onDragOver={(e) => drag.onZoneDragOver(e, key)}
                  onDragLeave={drag.onZoneDragLeave}
                  onDrop={(e) => drag.onZoneDrop(e, key)}
                >
                  <div className="flex items-center justify-between">
                    {isToday ? (
                      <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-[11px] font-medium tabular-nums text-primary-foreground">
                        {day.getDate()}
                      </span>
                    ) : (
                      <span className="text-xs tabular-nums text-muted-foreground">{day.getDate()}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onAdd(key)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity size-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <SvgIcon name="plus" size={11} />
                    </button>
                  </div>

                  {visible.map((p, index) => (
                    <Fragment key={p.id}>
                      {isOver && drag.dropIndex === index && <DropLine />}
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          drag.onPostDragStart(p.id, key, 'week')
                        }}
                        onDragEnd={drag.onPostDragEnd}
                        onDragOver={(e) => drag.onCardDragOver(e, key, index)}
                        onClick={(e) => { e.stopPropagation(); onEdit(p) }}
                        className={cn(
                          'bg-bg-2 flex items-center gap-1 rounded px-1 py-0.5 hover:bg-bg-3 cursor-pointer select-none transition-opacity',
                          drag.draggingPostId === p.id && 'opacity-40',
                        )}
                      >
                        <StatusIcon status={p.status} size={14} />
                        <span className="text-sm font-medium truncate">{p.klant_naam ?? '—'}</span>
                      </div>
                    </Fragment>
                  ))}
                  {/* invoegen achteraan (lege ruimte of onder de laatste kaart) */}
                  {isOver && (drag.dropIndex === null || drag.dropIndex >= visible.length) && <DropLine />}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenWeek(key) }}
                      className="self-start inline-flex items-center rounded border border-dashed border-border-strong/50 px-1.5 text-[11px] leading-5 text-muted-foreground hover:border-border-strong hover:text-foreground select-none"
                    >
                      +{overflow} {overflow === 1 ? 'post' : 'posts'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({ posts, currentDate, onAdd, drag, onEdit }: {
  posts: Post[]
  currentDate: Date
  onAdd: (date?: string) => void
  drag: DragHandlers
  onEdit: (post: Post) => void
}) {
  const days = getWeekDays(currentDate)
  const byDate = groupByDate(posts)
  const today = toLocalDateStr(new Date())
  const keys = days.map(toLocalDateStr)

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-border">
      {/* Day headers */}
      <div className="flex shrink-0">
        {days.map((day, di) => (
          <div key={keys[di]} className="flex-1 min-w-0 border border-border bg-border-subtle p-1.5">
            <span className={cn('block truncate text-xs', keys[di] === today ? 'text-foreground' : 'text-muted-foreground')}>
              {`${DAYS_NL_LONG[di]} ${day.getDate()} ${MONTHS_NL[day.getMonth()].toLowerCase()}`}
            </span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex flex-1 overflow-hidden">
        {days.map((day, di) => {
          const key = keys[di]
          const dayPosts = byDate.get(key) ?? []
          const isOver = drag.dragOverKey === key

          return (
            <div
              key={key}
              className="flex flex-1 min-w-0 flex-col overflow-hidden border border-border"
            >
              <div
                className="flex flex-1 flex-col gap-1 overflow-auto p-1.5"
                onDragOver={(e) => drag.onZoneDragOver(e, key)}
                onDragLeave={drag.onZoneDragLeave}
                onDrop={(e) => drag.onZoneDrop(e, key)}
              >
                {dayPosts.map((p, index) => (
                  <Fragment key={p.id}>
                    {isOver && drag.dropIndex === index && <DropLine />}
                    <PostCard
                      post={p}
                      hideDate
                      isDragging={drag.draggingPostId === p.id}
                      onDragStart={() => drag.onPostDragStart(p.id, key, 'week')}
                      onDragEnd={drag.onPostDragEnd}
                      onDragOver={(e) => drag.onCardDragOver(e, key, index)}
                      onClick={() => onEdit(p)}
                    />
                  </Fragment>
                ))}

                {/* Invoegen achteraan, of — als er nog niets staat — de toevoeg-knop wordt de drop-indicator */}
                {isOver && dayPosts.length > 0 && (drag.dropIndex === null || drag.dropIndex >= dayPosts.length) && <DropLine />}

                {isOver && dayPosts.length === 0 ? (
                  <div className="flex w-full shrink-0 items-center gap-1.5 rounded-sm bg-bg-4 px-2 py-1.5 text-xs text-foreground">
                    <SvgIcon name="circle-dashed" size={14} />
                    Post hier
                  </div>
                ) : (
                  <button
                    onClick={() => onAdd(key)}
                    className="flex w-full shrink-0 items-center gap-1.5 rounded-sm border border-dashed border-bg-4 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                  >
                    <SvgIcon name="plus" size={14} />
                    Nieuwe post
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── KanbanView ───────────────────────────────────────────────────────────────
// Thin wrapper around the shared <KanbanBoard> component.

const KANBAN_COLUMNS = STATUS_ORDER.map((status) => ({
  key:       status,
  label:     STATUS_CONFIG[status].label,
  iconName:  STATUS_CONFIG[status].iconName,
  textClass: STATUS_CONFIG[status].textClass,
}))

function KanbanView({ posts, currentDate, onAdd, onEdit, onMove }: {
  posts: Post[]
  currentDate: Date
  onAdd: (date?: string) => void
  onEdit: (post: Post) => void
  onMove: (postId: string, toStatus: PostStatus) => void
}) {
  const weekDays = getWeekDays(currentDate)
  const weekKeys = new Set(weekDays.map(toLocalDateStr))
  const inWeek = posts.filter((p) => !p.scheduled_at || weekKeys.has(p.scheduled_at.slice(0, 10)))

  return (
    <KanbanBoard
      columns={KANBAN_COLUMNS}
      items={inWeek}
      getItemId={(p) => p.id}
      getColKey={(p) => p.status}
      renderCard={(p, isDragging) => (
        <PostCard post={p} isDragging={isDragging} onClick={() => onEdit(p)} />
      )}
      onMove={(postId, toKey) => onMove(postId, toKey as PostStatus)}
      onAddItem={() => onAdd()}
      addItemLabel="Post toevoegen"
    />
  )
}

// ─── LijstView ────────────────────────────────────────────────────────────────

function LijstView({ posts, onAdd, onEdit }: {
  posts: Post[]
  onAdd: () => void
  onEdit: (post: Post) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const weeks = new Map<string, { label: string; date: Date; posts: Post[] }>()

  for (const p of posts) {
    const d = p.scheduled_at ? parseDate(p.scheduled_at) : new Date()
    const mon = getMonday(d)
    const key = toLocalDateStr(mon)
    if (!weeks.has(key)) {
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      weeks.set(key, { label: `Week van ${formatDateNL(mon)} / ${formatDateNL(sun)}`, date: mon, posts: [] })
    }
    weeks.get(key)!.posts.push(p)
  }

  const sortedWeeks = Array.from(weeks.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (sortedWeeks.length === 0) {
    return <EmptyState icon="layers" title="Geen posts gevonden." className="flex-1" />
  }

  return (
    <div className="flex-1 overflow-auto">
      {sortedWeeks.map(([weekKey, { label, posts: weekPosts }]) => (
        <div key={weekKey} className="border-b border-border last:border-b-0">
          <div className="px-8 py-3 text-xs font-medium text-muted-foreground bg-muted/20">
            {label}
          </div>

          {STATUS_ORDER.map((status) => {
            const groupPosts = weekPosts.filter((p) => p.status === status)
            if (groupPosts.length === 0) return null
            const sectionKey = `${weekKey}-${status}`
            const isCollapsed = collapsed.has(sectionKey)
            const cfg = STATUS_CONFIG[status]

            return (
              <div key={sectionKey}>
                <button
                  onClick={() => {
                    setCollapsed((prev) => { const n = new Set(prev); n.has(sectionKey) ? n.delete(sectionKey) : n.add(sectionKey); return n })
                  }}
                  className="w-full flex items-center gap-2 px-8 py-2 hover:bg-muted/30 transition-colors text-left"
                >
                  <StatusChip
                    iconName={cfg.iconName}
                    label={cfg.label}
                    textClass={cfg.textClass}
                    className="gap-2 text-xs font-medium"
                  />
                  <Badge variant="secondary" className="text-xs h-4 px-1.5 rounded-full">{groupPosts.length}</Badge>
                  <SvgIcon
                    name="chevron-right"
                    size={12}
                    className={cn('text-muted-foreground transition-transform ml-auto', !isCollapsed && 'rotate-90')}
                  />
                </button>

                {!isCollapsed && groupPosts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => onEdit(p)}
                    className={cn(
                      'flex items-center gap-3 px-8 py-2.5 border-t border-border/50 hover:bg-muted/20 cursor-pointer',
                      selected.has(p.id) && 'bg-muted/30',
                    )}
                  >
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => {
                        setSelected((prev) => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{p.klant_naam ?? '—'}</span>
                      {p.caption && (
                        <span className="block text-xs text-muted-foreground truncate mt-0.5">{p.caption}</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <TypeIcon type={p.type} size={12} />
                      {TYPE_CONFIG[p.type].label}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── ContentModule ────────────────────────────────────────────────────────────

interface Props {
  posts: Post[]
  klanten: Pick<Klant, 'id' | 'naam'>[]
  teamleden: TeamMember[]
}

export function ContentModule({ posts: initialPosts, klanten, teamleden }: Props) {
  const [view, setView] = useState<View>('maand')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [plannenOpen, setPlannenOpen] = useState(false)
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  // Local copy for optimistic DnD updates
  const [localPosts, setLocalPosts] = useState<Post[]>(initialPosts)
  useEffect(() => { setLocalPosts(initialPosts) }, [initialPosts])

  // ─── Drag state ─────────────────────────────────────────────────────────────
  const draggingRef = useRef<DragState | null>(null)
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  // Ref-spiegel van dropIndex: drop leest 'm synchroon (state is dan nog niet geflusht).
  const dropIndexRef = useRef<number | null>(null)
  const [, startTransition] = useTransition()

  function setDrop(index: number | null) {
    dropIndexRef.current = index
    setDropIndex(index)
  }

  function handlePostDragStart(postId: string, fromKey: string, type: 'week' | 'kanban') {
    draggingRef.current = { postId, fromKey, type }
    setDraggingPostId(postId)
  }

  function handlePostDragEnd() {
    draggingRef.current = null
    setDraggingPostId(null)
    setDragOverKey(null)
    setDrop(null)
  }

  // Lege celruimte → invoegen achteraan. Alleen reageren als de cel zélf het doel is,
  // niet wanneer het event vanuit een kaart naar boven bubbelt (die zet een exacte index).
  function handleZoneDragOver(e: React.DragEvent, key: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverKey !== key) setDragOverKey(key)
    if (e.target === e.currentTarget) setDrop(null)
  }

  // Boven een kaart: boven-/onderhelft bepaalt of de post ervóór of erná landt.
  function handleCardDragOver(e: React.DragEvent, key: string, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const after = e.clientY > rect.top + rect.height / 2
    const idx = index + (after ? 1 : 0)
    if (dragOverKey !== key) setDragOverKey(key)
    if (dropIndexRef.current !== idx) setDrop(idx)
  }

  function handleZoneDragLeave(e: React.DragEvent) {
    // Only clear when truly leaving the drop zone (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverKey(null)
    }
  }

  function handleZoneDrop(e: React.DragEvent, toKey: string) {
    e.preventDefault()
    const d = draggingRef.current
    if (!d) { handlePostDragEnd(); return }

    if (d.type === 'kanban') {
      if (d.fromKey !== toKey) {
        const newStatus = toKey as PostStatus
        const oldStatus = d.fromKey as PostStatus
        setLocalPosts((prev) => prev.map((p) =>
          p.id === d.postId ? { ...p, status: newStatus } : p,
        ))
        startTransition(() => { updatePostStatus(d.postId, newStatus, oldStatus) })
      }
      handlePostDragEnd()
      return
    }

    // Week/maand: herorden naar de exacte invoegplek op dag `toKey`.
    const displayed = localPosts
      .filter((p) => p.scheduled_at?.slice(0, 10) === toKey)
      .sort(byPosition)
    const k = dropIndexRef.current ?? displayed.length
    const movedIdx = displayed.findIndex((p) => p.id === d.postId)
    const without = displayed.filter((p) => p.id !== d.postId)
    // Stond de post al vóór het invoegpunt in deze dag? Dan schuift het punt één op.
    const insertAt = movedIdx !== -1 && movedIdx < k ? k - 1 : k
    const orderedIds = [
      ...without.slice(0, insertAt).map((p) => p.id),
      d.postId,
      ...without.slice(insertAt).map((p) => p.id),
    ]

    setLocalPosts((prev) => prev.map((p) => {
      const i = orderedIds.indexOf(p.id)
      if (i === -1) return p
      return p.id === d.postId ? { ...p, position: i, scheduled_at: toKey } : { ...p, position: i }
    }))
    startTransition(() => { reorderPostInDay(d.postId, toKey, orderedIds) })

    handlePostDragEnd()
  }

  // Called by the shared KanbanBoard for kanban-column status changes
  function handleKanbanMove(postId: string, toStatus: PostStatus) {
    const post = localPosts.find((p) => p.id === postId)
    if (!post || post.status === toStatus) return
    setLocalPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status: toStatus } : p))
    startTransition(() => { updatePostStatus(postId, toStatus, post.status) })
  }

  const drag: DragHandlers = {
    draggingPostId,
    dragOverKey,
    dropIndex,
    onPostDragStart: handlePostDragStart,
    onPostDragEnd: handlePostDragEnd,
    onZoneDragOver: handleZoneDragOver,
    onCardDragOver: handleCardDragOver,
    onZoneDrop: handleZoneDrop,
    onZoneDragLeave: handleZoneDragLeave,
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function openAdd(date?: string) {
    setEditingPost(null)
    setDefaultDate(date)
    setModalOpen(true)
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setDefaultDate(undefined)
    setModalOpen(true)
  }

  function navigate(dir: -1 | 1) {
    setCurrentDate((d) => {
      const next = new Date(d)
      if (view === 'maand') next.setMonth(next.getMonth() + dir)
      else next.setDate(next.getDate() + dir * 7)
      return next
    })
  }

  function getPeriodLabel() {
    if (view === 'maand' || view === 'lijst') {
      return `${MONTHS_NL[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
    const mon = getMonday(currentDate)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return `Week ${getISOWeek(mon)}  ${formatDateNL(mon)} t/m ${formatDateNL(sun)}`
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Content"
        iconName="layers"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPlannenOpen(true)}>
              <SvgIcon name="calendar" size={13} />
              Content plannen
            </Button>
            <Button size="sm" onClick={() => openAdd()} className="gap-1.5">
              <SvgIcon name="plus" size={14} />
              Nieuwe post maken
            </Button>
          </>
        }
        toolbar={
          <>
            <PageToolbar>
              <SegmentedControl options={VIEWS} value={view} onChange={setView} />

              <div className="ml-auto">
                <Button variant="ghost" size="xs" className="gap-1.5">
                  <SvgIcon name="filter" size={12} />
                  Filters openen
                </Button>
              </div>
            </PageToolbar>

            {(view === 'maand' || view === 'week' || view === 'kanban') && (
              <div className="border-t border-border shrink-0 flex items-center justify-center px-3 py-1">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => navigate(-1)}>
                    <SvgIcon name="chevron-left" size={14} />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[160px] text-center">
                    {getPeriodLabel()}
                  </span>
                  <Button variant="ghost" size="icon-xs" onClick={() => navigate(1)}>
                    <SvgIcon name="chevron-right" size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        }
      />

      {/* ── View content ────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0">
        {view === 'maand' && <MaandView posts={localPosts} currentDate={currentDate} onAdd={openAdd} drag={drag} onEdit={openEdit} onOpenWeek={(key) => { setCurrentDate(parseDate(key)); setView('week') }} />}
        {view === 'week' && <WeekView posts={localPosts} currentDate={currentDate} onAdd={openAdd} drag={drag} onEdit={openEdit} />}
        {view === 'kanban' && <KanbanView posts={localPosts} currentDate={currentDate} onAdd={openAdd} onEdit={openEdit} onMove={handleKanbanMove} />}
        {view === 'lijst' && <LijstView posts={localPosts} onAdd={openAdd} onEdit={openEdit} />}
      </div>

      {/* ── Drawer ──────────────────────────────────────────────────── */}
      <NieuwePostDrawer
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingPost(null) }}
        klanten={klanten}
        teamleden={teamleden}
        defaultDate={defaultDate}
        post={editingPost ?? undefined}
      />

      <ContentPlannenDrawer
        open={plannenOpen}
        onOpenChange={setPlannenOpen}
        klanten={klanten}
      />
    </div>
  )
}
