import type { TodoWithAssignees } from '@/types/todo'

/** Afgevinkt onderaan, dan volgorde oplopend, dan nieuwste eerst. Pure (kopieert). */
export function sortTodos(todos: TodoWithAssignees[]): TodoWithAssignees[] {
  return [...todos].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      a.volgorde - b.volgorde ||
      b.created_at.localeCompare(a.created_at),
  )
}
