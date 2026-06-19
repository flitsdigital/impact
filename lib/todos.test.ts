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

  it('sorteert op datum oplopend, taken zonder datum onderaan', () => {
    const out = sortTodos([
      make({ id: 'geen' }),
      make({ id: 'laat', deadline: '2026-03-01' }),
      make({ id: 'vroeg', deadline: '2026-01-01' }),
    ])
    expect(out.map((t) => t.id)).toEqual(['vroeg', 'laat', 'geen'])
  })

  it('sorteert bij gelijke datum op prioriteit (urgent eerst)', () => {
    const out = sortTodos([
      make({ id: 'normaal', deadline: '2026-01-01', prioriteit: 'normaal' }),
      make({ id: 'urgent', deadline: '2026-01-01', prioriteit: 'urgent' }),
      make({ id: 'hoog', deadline: '2026-01-01', prioriteit: 'hoog' }),
    ])
    expect(out.map((t) => t.id)).toEqual(['urgent', 'hoog', 'normaal'])
  })

  it('muteert de input niet', () => {
    const input = [make({ id: 'a', done: true }), make({ id: 'b' })]
    sortTodos(input)
    expect(input.map((t) => t.id)).toEqual(['a', 'b'])
  })
})
