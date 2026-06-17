import { describe, it, expect } from 'vitest'
import { sortTodos } from './todos'
import type { TodoWithAssignees } from '@/types/todo'

const make = (over: Partial<TodoWithAssignees>): TodoWithAssignees => ({
  id: 'x', user_id: 'u', titel: 't', notitie: null, done: false, deadline: null,
  prioriteit: 'normaal', volgorde: 0, created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z', assignees: [], ...over,
})

describe('sortTodos', () => {
  it('zet afgevinkte todo\'s onderaan', () => {
    const out = sortTodos([make({ id: 'a', done: true }), make({ id: 'b', done: false })])
    expect(out.map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('sorteert open todo\'s op volgorde, dan nieuwste eerst', () => {
    const out = sortTodos([
      make({ id: 'oud', volgorde: 0, created_at: '2026-01-01T00:00:00Z' }),
      make({ id: 'nieuw', volgorde: 0, created_at: '2026-02-01T00:00:00Z' }),
      make({ id: 'eerst', volgorde: -1, created_at: '2026-01-01T00:00:00Z' }),
    ])
    expect(out.map((t) => t.id)).toEqual(['eerst', 'nieuw', 'oud'])
  })

  it('muteert de input niet', () => {
    const input = [make({ id: 'a', done: true }), make({ id: 'b' })]
    sortTodos(input)
    expect(input.map((t) => t.id)).toEqual(['a', 'b'])
  })
})
