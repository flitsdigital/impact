'use client'

import { KanbanBoard as SharedKanbanBoard } from '@/components/ui/KanbanBoard'
import type { TaskWithRelations, TaskStatus } from '@/types/project'
import { KANBAN_COLUMNS } from '@/types/project'
import { TaakKaart } from './TaakKaart'

interface KanbanBoardProps {
  tasks:        TaskWithRelations[]
  onTaskClick:  (task: TaskWithRelations) => void
  onAddTask:    (status: TaskStatus) => void
  onMove:       (taskId: string, toStatus: TaskStatus) => void
  showProject?: boolean
}

export function KanbanBoard({ tasks, onTaskClick, onAddTask, onMove, showProject = false }: KanbanBoardProps) {
  return (
    <SharedKanbanBoard
      columns={KANBAN_COLUMNS.map((col) => ({
        key:         col.status,
        label:       col.label,
        iconName:    col.iconName,
        textClass:   col.textClass,
        isCollapsed: col.isCollapsed,
      }))}
      items={tasks}
      getItemId={(t) => t.id}
      getColKey={(t) => t.status}
      renderCard={(task, isDragging) => (
        <TaakKaart
          task={task}
          isDragging={isDragging}
          showProject={showProject}
          onClick={() => onTaskClick(task)}
        />
      )}
      onMove={(taskId, toKey) => onMove(taskId, toKey as TaskStatus)}
      onAddItem={(colKey) => onAddTask(colKey as TaskStatus)}
      addItemLabel="Taak toevoegen"
    />
  )
}
