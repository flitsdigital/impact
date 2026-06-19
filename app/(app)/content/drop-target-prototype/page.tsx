'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

// ponytail: prototype-pagina om drop-target varianten te voelen. Geen shared component (nog),
// dus geen DemoBlock op /design-system — pas verplaatsen als er een winnaar gekozen is.

type Variant = 'ghost' | 'ring' | 'fill' | 'line'

const VARIANTS: { key: Variant; label: string; hint: string }[] = [
  { key: 'ghost', label: 'Ghost kaart',  hint: 'Ruimte opent zich op de landingsplek' },
  { key: 'ring',  label: 'Ring om cel',  hint: 'Hele dag licht op met een rand' },
  { key: 'fill',  label: 'Sterke fill',  hint: 'Cel krijgt een sterkere tint' },
  { key: 'line',  label: 'Insert-lijn',  hint: 'Cursor-lijn waar de kaart komt' },
]

const DOT: Record<string, string> = {
  groen: 'bg-emerald-500',
  paars: 'bg-violet-500',
  grijs: 'bg-muted-foreground',
}

type Post = { id: string; label: string; kleur: keyof typeof DOT; day: number }

const INITIAL: Post[] = [
  { id: 'p1', label: 'Bioaktief',        kleur: 'groen', day: 0 },
  { id: 'p2', label: 'M. Peters Mont.',  kleur: 'paars', day: 0 },
  { id: 'p3', label: 'Total Car Perfe.', kleur: 'groen', day: 2 },
  { id: 'p4', label: 'Dorpsgarage O.',   kleur: 'paars', day: 4 },
  { id: 'p5', label: 'Frank van der L.', kleur: 'grijs', day: 4 },
]

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DATES = [15, 16, 17, 18, 19, 20, 21]

export default function DropTargetPrototype() {
  const [variant, setVariant] = useState<Variant>('ghost')
  const [posts, setPosts] = useState<Post[]>(INITIAL)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overDay, setOverDay] = useState<number | null>(null)

  const drop = (day: number) => {
    if (!draggingId) return
    setPosts((prev) => prev.map((p) => (p.id === draggingId ? { ...p, day } : p)))
    setDraggingId(null)
    setOverDay(null)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Drop-target prototype</h1>
        <p className="text-sm text-muted-foreground">
          Sleep een kaart naar een andere dag. Wissel van variant om het landingsgevoel te vergelijken.
        </p>
      </header>

      {/* Segmented switcher */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit gap-1 rounded-lg bg-muted/40 p-1">
          {VARIANTS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setVariant(v.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
                variant === v.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground pl-1">
          {VARIANTS.find((v) => v.key === variant)!.hint}
        </p>
      </div>

      {/* Mini week grid */}
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border">
        {DAYS.map((d, i) => (
          <div key={d} className="border-b border-r border-border last:border-r-0 px-2 py-1.5 text-xs text-muted-foreground">
            {d}
          </div>
        ))}

        {DATES.map((date, day) => {
          const dayPosts = posts.filter((p) => p.day === day)
          const isOver = overDay === day
          const showGhost = isOver && variant === 'ghost'
          const showLine = isOver && variant === 'line'

          return (
            <div
              key={date}
              onDragOver={(e) => {
                e.preventDefault()
                if (overDay !== day) setOverDay(day)
              }}
              onDragLeave={(e) => {
                // alleen leegmaken als we de cel echt verlaten
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOverDay((cur) => (cur === day ? null : cur))
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                drop(day)
              }}
              className={cn(
                'relative min-h-[120px] border-r border-border last:border-r-0 p-1.5 flex flex-col gap-1 transition-all duration-200',
                isOver && variant === 'ring' && 'ring-2 ring-inset ring-primary bg-primary/5',
                isOver && variant === 'fill' && 'bg-primary/15',
              )}
            >
              <span className="text-xs tabular-nums text-muted-foreground px-0.5">{date}</span>

              {/* Insert-lijn bovenaan de lijst */}
              <div
                className={cn(
                  'h-0.5 rounded-full bg-primary origin-left transition-all duration-200 ease-out',
                  showLine
                    ? 'scale-x-100 opacity-100 shadow-[0_0_8px_var(--primary)]'
                    : 'scale-x-0 opacity-0',
                )}
              />

              {dayPosts.map((p) => (
                <div
                  key={`${p.id}-${p.day}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggingId(p.id)
                  }}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setOverDay(null)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md bg-bg-2 px-1.5 py-1 cursor-grab select-none',
                    'transition-all duration-200 hover:bg-bg-3',
                    'animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-300', // landing-beweging bij remount
                    draggingId === p.id && 'opacity-40 scale-95 cursor-grabbing',
                  )}
                >
                  <span className={cn('size-2.5 shrink-0 rounded-full', DOT[p.kleur])} />
                  <span className="text-sm font-medium truncate">{p.label}</span>
                </div>
              ))}

              {/* Ghost placeholder: ruimte die smooth open-/dichtklapt */}
              <div
                className={cn(
                  'grid transition-all duration-200 ease-out',
                  showGhost ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5 rounded-md border border-dashed border-primary/60 bg-primary/5 px-1.5 py-1">
                    <span className="size-2.5 shrink-0 rounded-full border border-dashed border-primary/60" />
                    <span className="text-sm font-medium text-primary/70">Landt hier</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: sleep dezelfde kaart een paar keer heen en weer — de landing-pop speelt elke keer opnieuw af.
      </p>
    </div>
  )
}
