'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { STATUS_ICON, STATUS_ORDER, type PostStatus } from '@/types/post'

// ponytail: prototype-pagina om maand-view varianten te vergelijken (drukke dagen + "vandaag").
// Mockdata, geen DB. Geen shared component / DemoBlock tot er een winnaar gekozen is —
// dan verhuist de winnaar naar MaandView in ContentModule.tsx.

type Variant = 'streep' | 'lijst' | 'chip'

const VARIANTS: { value: Variant; label: string; icon: string; hint: string }[] = [
  { value: 'streep', label: 'Status-streep', icon: 'layout-columns', hint: 'Chip met kleurbalk links' },
  { value: 'lijst',  label: 'Kleurstip-lijst', icon: 'list-check',   hint: 'Platte stip + naam, compact' },
  { value: 'chip',   label: 'Gekleurde chip',  icon: 'chart-kanban', hint: 'Chip in status-kleurvlak + icoon' },
]

// Status → Tailwind tokens (spiegelt STATUS_CONFIG in ContentModule).
const STATUS_DOT: Record<PostStatus, string> = {
  te_doen: 'bg-muted-foreground',
  bezig: 'bg-orange-500',
  klaar_voor_feedback: 'bg-blue-500',
  akkoord: 'bg-purple-500',
  gepost: 'bg-green-500',
}
const STATUS_TEXT: Record<PostStatus, string> = {
  te_doen: 'text-muted-foreground',
  bezig: 'text-orange-500',
  klaar_voor_feedback: 'text-blue-500',
  akkoord: 'text-purple-500',
  gepost: 'text-green-500',
}
const STATUS_TINT: Record<PostStatus, string> = {
  te_doen: 'bg-muted',
  bezig: 'bg-orange-500/15',
  klaar_voor_feedback: 'bg-blue-500/15',
  akkoord: 'bg-purple-500/15',
  gepost: 'bg-green-500/15',
}

type MockPost = { id: string; klant: string; status: PostStatus; day: number }

// Juni 2026 — losjes op de echte data; dag 11 is bewust overvol om "+N" te tonen.
const POSTS: MockPost[] = [
  { id: '1',  klant: 'M. Peters Montage',    status: 'akkoord', day: 2 },
  { id: '2',  klant: 'Frank van der Laan',   status: 'gepost',  day: 4 },
  { id: '3',  klant: 'Total Car Perfection', status: 'gepost',  day: 5 },
  { id: '4',  klant: 'Dorpsgarage Odoorn',   status: 'akkoord', day: 5 },
  { id: '5',  klant: 'Bioaktief',            status: 'gepost',  day: 5 },
  { id: '6',  klant: 'Bioaktief',            status: 'te_doen', day: 11 },
  { id: '7',  klant: 'Total Car Perfection', status: 'gepost',  day: 11 },
  { id: '8',  klant: 'Frank van der Laan',   status: 'bezig',   day: 11 },
  { id: '9',  klant: 'Dorpsgarage Odoorn',   status: 'akkoord', day: 11 },
  { id: '10', klant: 'M. Peters Montage',    status: 'klaar_voor_feedback', day: 11 },
  { id: '11', klant: 'Bioaktief',            status: 'te_doen', day: 12 },
  { id: '12', klant: 'Dorpsgarage Odoorn',   status: 'te_doen', day: 12 },
  { id: '13', klant: 'Frank van der Laan',   status: 'te_doen', day: 18 },
  { id: '14', klant: 'Total Car Perfection', status: 'bezig',   day: 18 },
  { id: '15', klant: 'Dorpsgarage Odoorn',   status: 'te_doen', day: 18 },
  { id: '16', klant: 'Total Car Perfection', status: 'te_doen', day: 19 },
  { id: '17', klant: 'Dorpsgarage Odoorn',   status: 'akkoord', day: 19 },
  { id: '18', klant: 'Total Car Perfection', status: 'te_doen', day: 25 },
  { id: '19', klant: 'Dorpsgarage Odoorn',   status: 'te_doen', day: 25 },
  { id: '20', klant: 'Dorpsgarage Odoorn',   status: 'te_doen', day: 26 },
]

const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const TODAY = 18 // juni 2026

// Maand-grid voor juni 2026 (1 juni = maandag).
function buildMonth(): { day: number; inMonth: boolean }[][] {
  const first = new Date(2026, 5, 1)
  const last = new Date(2026, 6, 0).getDate() // 30
  const offset = (first.getDay() + 6) % 7 // ma=0
  const cells: { day: number; inMonth: boolean }[] = []
  for (let i = 0; i < offset; i++) cells.push({ day: 31 - offset + i + 1, inMonth: false }) // mei-staart
  for (let d = 1; d <= last; d++) cells.push({ day: d, inMonth: true })
  let next = 1
  while (cells.length % 7 !== 0) cells.push({ day: next++, inMonth: false })
  const weeks: { day: number; inMonth: boolean }[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function CalendarViewPrototype() {
  const [variant, setVariant] = useState<Variant>('streep')
  const weeks = buildMonth()

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Maand-view prototypes</h1>
        <p className="text-sm text-muted-foreground">
          Drie richtingen om drukke dagen op te ruimen en de dag van vandaag te laten opvallen. Wissel om te vergelijken.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <SegmentedControl options={VARIANTS} value={variant} onChange={setVariant} className="w-fit" />
        <p className="text-xs text-muted-foreground pl-1">
          {VARIANTS.find((v) => v.value === variant)!.hint}
        </p>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-border">
        <div className="bg-bg-2 grid grid-cols-7 border-b border-border">
          {DAYS_NL.map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((cell, ci) => {
              const dayPosts = cell.inMonth ? POSTS.filter((p) => p.day === cell.day) : []
              const isToday = cell.inMonth && cell.day === TODAY

              return (
                <div
                  key={ci}
                  className={cn(
                    'relative border-r border-border last:border-r-0 p-2 flex flex-col gap-1 min-h-[120px] transition-colors',
                    !cell.inMonth && 'opacity-35',
                  )}
                >
                  <DayNumber day={cell.day} isToday={isToday} />

                  {variant === 'streep'  && <StreepPosts posts={dayPosts} />}
                  {variant === 'lijst'   && <LijstPosts posts={dayPosts} />}
                  {variant === 'chip'    && <ChipPosts posts={dayPosts} />}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayNumber({ day, isToday }: { day: number; isToday: boolean }) {
  if (isToday) {
    return (
      <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-[11px] font-medium tabular-nums text-primary-foreground">
        {day}
      </span>
    )
  }
  return <span className="text-xs tabular-nums leading-[18px] text-muted-foreground">{day}</span>
}

// Ghost-kaartje met stippellijn dat aangeeft dat er meer posts onder zitten.
function GhostMore({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <div className="flex items-center justify-center rounded border border-dashed border-border-strong/60 px-1.5 py-0.5 text-xs font-medium text-muted-foreground cursor-pointer hover:border-border-strong hover:text-foreground select-none">
      +{count} {count === 1 ? 'post' : 'posts'}
    </div>
  )
}

// ─── Variant 1: chip met kleurbalk links ───────────────────────────────────────
function StreepPosts({ posts }: { posts: MockPost[] }) {
  const shown = posts.slice(0, 3)
  const over = posts.length - shown.length
  return (
    <>
      {shown.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 overflow-hidden rounded bg-bg-2 py-0.5 pr-1.5 hover:bg-bg-3 cursor-pointer select-none">
          <span className={cn('w-[3px] self-stretch rounded-full', STATUS_DOT[p.status])} />
          <span className="truncate text-sm font-medium">{p.klant}</span>
        </div>
      ))}
      <GhostMore count={over} />
    </>
  )
}

// ─── Variant 2: platte stip + naam ──────────────────────────────────────────────
function LijstPosts({ posts }: { posts: MockPost[] }) {
  const shown = posts.slice(0, 4)
  const over = posts.length - shown.length
  return (
    <>
      {shown.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 px-0.5 rounded hover:bg-bg-2 cursor-pointer select-none">
          <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[p.status])} />
          <span className="truncate text-sm">{p.klant}</span>
        </div>
      ))}
      <GhostMore count={over} />
    </>
  )
}

// ─── Variant 3: chip in status-kleurvlak + icoon ───────────────────────────────
function ChipPosts({ posts }: { posts: MockPost[] }) {
  const shown = posts.slice(0, 3)
  const over = posts.length - shown.length
  return (
    <>
      {shown.map((p) => (
        <div key={p.id} className={cn('flex items-center gap-1.5 overflow-hidden rounded px-1.5 py-0.5 cursor-pointer select-none', STATUS_TINT[p.status])}>
          <SvgIcon name={STATUS_ICON[p.status]} size={12} className={cn('shrink-0', STATUS_TEXT[p.status])} />
          <span className="truncate text-sm font-medium">{p.klant}</span>
        </div>
      ))}
      <GhostMore count={over} />
    </>
  )
}
