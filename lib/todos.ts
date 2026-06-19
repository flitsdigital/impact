import type { TodoWithAssignees } from '@/types/todo'
import type { TaskPriority } from '@/types/project'

const PRIO_RANK: Record<TaskPriority, number> = { urgent: 0, hoog: 1, normaal: 2, laag: 3 }

// Vroegste datum eerst; taken zonder datum onderaan.
const cmpDeadline = (a: string | null, b: string | null) =>
  a === b ? 0 : !a ? 1 : !b ? -1 : a.localeCompare(b)

/** Afgevinkt onderaan, dan op datum (oplopend), dan prioriteit, dan nieuwste eerst. Pure (kopieert). */
export function sortTodos(todos: TodoWithAssignees[]): TodoWithAssignees[] {
  return [...todos].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      cmpDeadline(a.deadline, b.deadline) ||
      PRIO_RANK[a.prioriteit] - PRIO_RANK[b.prioriteit] ||
      b.created_at.localeCompare(a.created_at),
  )
}
