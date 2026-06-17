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
  const { open, loading, todos, team, closeDrawer, openDrawer, add, toggle, patch, assign, remove } = useTakenStore()

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
        {/* Quick-add */}
        <div className="rounded-lg border border-border-subtle bg-bg-2 p-3" data-vaul-no-drag>
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Nieuwe taak…"
            className="w-full bg-transparent text-[15px] text-fg-1 outline-none placeholder:text-fg-3"
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <DateShortcutsPicker value={deadline} onChange={setDeadline} />
            <PriorityFlags value={prioriteit} onChange={setPrioriteit} />
            <AssigneeDropdown value={assignees} team={team} onToggle={toggleDraftAssignee} />
            <Button size="sm" className="ml-auto" disabled={!titel.trim()} onClick={submit}>Toevoegen</Button>
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
