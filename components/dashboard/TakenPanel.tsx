'use client'

import * as React from 'react'
import { useTakenStore } from '@/store/taken'
import { TodoRow } from '@/components/todos/TodoRow'
import { Panel, PanelHeader, PanelEmpty } from './DashboardPanel'

// Jouw taken — exact dezelfde rij-UI als de "Mijn taken"-drawer (TodoRow + store),
// zodat wijzigingen op beide plekken live synchroon lopen.
export function TakenPanel() {
  const { loading, todos, team, load, toggle, patch, assign, remove } = useTakenStore()

  React.useEffect(() => { void load() }, [load])

  const open = todos.filter((t) => !t.done)

  return (
    <Panel>
      <PanelHeader icon="list-check" title="Jouw taken" count={open.length} />
      {loading ? (
        <p className="px-4 py-6 text-center text-[13px] text-fg-3">Laden…</p>
      ) : open.length === 0 ? (
        <PanelEmpty icon="circle-check" text="Geen openstaande taken" />
      ) : (
        <div className="px-4 py-1">
          <div className="divide-y divide-border-subtle/60">
            {open.slice(0, 8).map((t) => (
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
        </div>
      )}
    </Panel>
  )
}
