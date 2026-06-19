'use client'

import { create } from 'zustand'
import type { TodoWithAssignees, TeamMember, TodoAssignee } from '@/types/todo'
import type { TaskPriority } from '@/types/project'
import { sortTodos } from '@/lib/todos'
import {
  getTodos, getTeam, createTodo, toggleDone, updateTodo, setAssignees, deleteTodo,
} from '@/app/(app)/_actions/todos'

export interface NewTodoInput {
  titel: string
  notitie?: string | null
  deadline?: string | null
  prioriteit?: TaskPriority
  assignees?: string[]
}

interface TakenState {
  open: boolean
  loaded: boolean
  loading: boolean
  todos: TodoWithAssignees[]
  team: TeamMember[]
  openDrawer: () => Promise<void>
  closeDrawer: () => void
  add: (input: NewTodoInput) => Promise<void>
  load: () => Promise<void>
  toggle: (id: string) => Promise<void>
  patch: (id: string, updates: Partial<Pick<TodoWithAssignees, 'titel' | 'notitie' | 'deadline' | 'prioriteit'>>) => Promise<void>
  assign: (id: string, profileIds: string[]) => Promise<void>
  remove: (id: string) => Promise<void>
}

const assigneesFromTeam = (team: TeamMember[], ids: string[]): TodoAssignee[] =>
  team
    .filter((m) => ids.includes(m.id))
    .map((m) => ({ profile_id: m.id, profiles: { id: m.id, full_name: m.full_name, avatar_url: m.avatar_url } }))

export const useTakenStore = create<TakenState>((set, get) => ({
  open: false,
  loaded: false,
  loading: false,
  todos: [],
  team: [],

  // Fetch één keer; volgende calls zijn no-ops dankzij de loaded/loading-guard.
  // Zo blijft de lijst geladen over paginawissels heen (store is een singleton).
  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    const [todos, team] = await Promise.all([getTodos(), getTeam()])
    set({ todos: sortTodos(todos), team, loaded: true, loading: false })
  },

  openDrawer: async () => {
    set({ open: true })
    await get().load()
  },

  closeDrawer: () => set({ open: false }),

  add: async (input) => {
    const temp: TodoWithAssignees = {
      id: `temp-${Date.now()}`,
      user_id: '', titel: input.titel, notitie: input.notitie ?? null,
      done: false, deadline: input.deadline ?? null,
      prioriteit: input.prioriteit ?? 'normaal', volgorde: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      assignees: assigneesFromTeam(get().team, input.assignees ?? []),
    }
    set((s) => ({ todos: sortTodos([temp, ...s.todos]) }))
    const { todo, error } = await createTodo(input)
    if (error || !todo) {
      set((s) => ({ todos: s.todos.filter((t) => t.id !== temp.id) }))
      return
    }
    set((s) => ({ todos: sortTodos(s.todos.map((t) => (t.id === temp.id ? todo : t))) }))
  },

  toggle: async (id) => {
    const prev = get().todos
    set({ todos: sortTodos(prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))) })
    const target = prev.find((t) => t.id === id)
    const { error } = await toggleDone(id, !target?.done)
    if (error) set({ todos: prev })
  },

  patch: async (id, updates) => {
    const prev = get().todos
    set({ todos: sortTodos(prev.map((t) => (t.id === id ? { ...t, ...updates } : t))) })
    const { error } = await updateTodo(id, updates)
    if (error) set({ todos: prev })
  },

  assign: async (id, profileIds) => {
    const prev = get().todos
    set({ todos: prev.map((t) => (t.id === id ? { ...t, assignees: assigneesFromTeam(get().team, profileIds) } : t)) })
    const { error } = await setAssignees(id, profileIds)
    if (error) set({ todos: prev })
  },

  remove: async (id) => {
    const prev = get().todos
    set({ todos: prev.filter((t) => t.id !== id) })
    const { error } = await deleteTodo(id)
    if (error) set({ todos: prev })
  },
}))
