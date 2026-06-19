'use client'

import * as React from 'react'
import { useTakenStore } from '@/store/taken'
import { AppDrawer, AppDrawerHeader, AppDrawerBody } from '@/components/ui/AppDrawer'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { EmptyState } from '@/components/ui/EmptyState'
import { TodoRow } from '@/components/todos/TodoRow'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TaskPriority } from '@/types/project'

export function TakenDrawer() {
  const { open, loading, todos, team, load, closeDrawer, openDrawer, add, toggle, patch, assign, remove } = useTakenStore()

  // Eager prefetch: de drawer zit in de (app)-layout en blijft gemount, dus dit
  // draait één keer bij page load. Bij openen is de lijst er al → instant.
  React.useEffect(() => { void load() }, [load])

  // Quick-add draft-state
  const [titel, setTitel] = React.useState('')
  const [deadline, setDeadline] = React.useState('')
  const [prioriteit, setPrioriteit] = React.useState<TaskPriority>('normaal')
  const [assignees, setAssignees] = React.useState<string[]>([])

  // Globale sneltoets ⌘⇧T / Ctrl⇧T
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        if (useTakenStore.getState().open) closeDrawer()
        else void openDrawer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openDrawer, closeDrawer])

  function submit() {
    if (!titel.trim()) return
    void add({ titel: titel.trim(), deadline: deadline || null, prioriteit, assignees })
    setTitel(''); setDeadline(''); setPrioriteit('normaal'); setAssignees([])
  }

  const toggleDraftAssignee = (id: string) =>
    setAssignees((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))

  return (
    <AppDrawer open={open} onOpenChange={(o) => (o ? void openDrawer() : closeDrawer())} title="Mijn taken" width={460}>
      <AppDrawerHeader>
        <span className="text-[13px] font-medium text-fg-1">Mijn taken</span>
        <Button variant="ghost" size="icon-sm" aria-label="Sluiten" onClick={closeDrawer}>
          <SvgIcon name="x" size={16} />
        </Button>
      </AppDrawerHeader>

      <AppDrawerBody>
        {/* Quick-add — C2: alles op één regel, Enter voegt toe */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-bg-2 px-3 py-2" data-vaul-no-drag>
          <span className="grid size-4 shrink-0 place-content-center rounded-full border border-border-strong" />
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Nieuwe taak…"
            className="min-w-[8rem] flex-1 bg-transparent text-[14px] text-fg-1 outline-none placeholder:text-fg-3"
          />
          <div className="flex items-center gap-1.5">
            <DateShortcutsPicker value={deadline} onChange={setDeadline} />
            <PriorityFlags value={prioriteit} onChange={setPrioriteit} />
            <AssigneeDropdown value={assignees} team={team} onToggle={toggleDraftAssignee} />
          </div>
        </div>

        {/* Lijst */}
        {loading ? (
          <p className="px-1 py-6 text-center text-[13px] text-fg-3">Laden…</p>
        ) : todos.length === 0 ? (
          <EmptyState icon="list-check" title="Nog geen taken." description="Voeg je eerste taak toe hierboven." />
        ) : (
          <div className="divide-y divide-border-subtle/60">
            {todos.map((t) => (
              <TodoRow
                key={t.id}
                todo={t}
                team={team}
                onToggle={() => void toggle(t.id)}
                onTitle={(v) => void patch(t.id, { titel: v })}
                onDate={(v) => void patch(t.id, { deadline: v || null })}
                onPriority={(v) => void patch(t.id, { prioriteit: v })}
                onAssignToggle={(id) => {
                  const cur = t.assignees.map((a) => a.profile_id)
                  void assign(t.id, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
                }}
                onDelete={() => void remove(t.id)}
              />
            ))}
          </div>
        )}
      </AppDrawerBody>
    </AppDrawer>
  )
}
