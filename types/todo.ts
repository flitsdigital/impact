import type { TaskPriority } from '@/types/project'

export interface Todo {
  id:         string
  user_id:    string
  titel:      string
  notitie:    string | null
  done:       boolean
  deadline:   string | null
  prioriteit: TaskPriority
  volgorde:   number
  created_at: string
  updated_at: string
}

export interface TodoAssignee {
  profile_id: string
  profiles: { id: string; full_name: string | null; avatar_url: string | null }
}

export interface TodoWithAssignees extends Todo {
  assignees: TodoAssignee[]
}

export interface TeamMember {
  id:         string
  full_name:  string | null
  avatar_url: string | null
}
