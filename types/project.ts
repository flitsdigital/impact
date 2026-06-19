export type ProjectStatus = 'gepland' | 'bezig' | 'feedback' | 'klaar' | 'gearchiveerd'
export type TaskStatus    = 'todo' | 'bezig' | 'feedback' | 'klaar'
export type TaskPriority  = 'urgent' | 'hoog' | 'normaal' | 'laag'

export interface Project {
  id:             string
  klant_id:       string | null
  naam:           string
  beschrijving:   string | null
  status:         ProjectStatus
  prioriteit:     TaskPriority
  kleur:          string
  budget:         number | null
  start_date:     string | null
  deadline:       string | null
  project_number: number
  created_at:     string
  updated_at:     string
}

export interface ProjectLabel {
  id:         string
  project_id: string
  naam:       string
  kleur:      string
  created_at: string
}

export interface Milestone {
  id:         string
  project_id: string
  naam:       string
  datum:      string | null
  voltooid:   boolean
  created_at: string
}

export interface Task {
  id:              string
  project_id:      string
  sprint_id:       string | null
  milestone_id:    string | null
  parent_id:       string | null
  task_number:     number
  titel:           string
  beschrijving:    string | null
  status:          TaskStatus
  prioriteit:      TaskPriority
  deadline:        string | null
  schatting_uren:  number | null
  gelogde_uren:    number
  volgorde:        number
  created_at:      string
  updated_at:      string
}

// ─── Project kanban columns ──────────────────────────────────────────────────

export const PROJECT_COLUMNS: {
  status:      ProjectStatus
  label:       string
  iconName:    string
  textClass:   string
  isCollapsed?: boolean
}[] = [
  { status: 'gepland',      label: 'Te doen',      iconName: 'circle-dashed', textClass: 'text-fg-2' },
  { status: 'bezig',        label: 'Bezig',        iconName: 'circle-notch',  textClass: 'text-orange-500' },
  { status: 'feedback',     label: 'Feedback',     iconName: 'circle',        textClass: 'text-blue-500' },
  { status: 'klaar',        label: 'Klaar',        iconName: 'circle-check',  textClass: 'text-green-500', isCollapsed: true },
  { status: 'gearchiveerd', label: 'Gearchiveerd', iconName: 'circle-dashed', textClass: 'text-fg-3',      isCollapsed: true },
]

// ─── Rich / joined types ──────────────────────────────────────────────────────

export interface ProjectAssigneeProfile {
  profile_id: string
  profiles: {
    id:         string
    full_name:  string | null
    avatar_url: string | null
    email:      string | null
  }
}

export interface ProjectDocument {
  id:         string
  project_id: string
  type:       'link' | 'file'
  naam:       string
  url:        string
  created_at: string
}

export interface ProjectWithRelations extends Project {
  klanten?:    { id: string; naam: string } | null
  assignees:   ProjectAssigneeProfile[]
  labels:      ProjectLabel[]
  favorites:   Array<{ user_id: string }>
  documents:   ProjectDocument[]
}

export interface TaskWithRelations extends Task {
  project?:        Pick<Project, 'id' | 'naam' | 'kleur'>
  assignees:       ProjectAssigneeProfile[]
  labels:          Array<{ label_id: string; project_labels: ProjectLabel }>
  subtasks:        Task[]          // direct children (parent_id = this.id)
  subtask_done:    number          // computed: subtasks with status='klaar'
  subtask_total:   number          // computed: subtasks.length
}

// ─── Kanban helpers ───────────────────────────────────────────────────────────

export const KANBAN_COLUMNS: {
  status:      TaskStatus
  label:       string
  iconName:    string
  textClass:   string
  isCollapsed?: boolean
}[] = [
  { status: 'todo',     label: 'Te doen',  iconName: 'circle-dashed', textClass: 'text-fg-2' },
  { status: 'bezig',    label: 'Bezig',    iconName: 'circle-notch',  textClass: 'text-orange-500' },
  { status: 'feedback', label: 'Feedback', iconName: 'circle',        textClass: 'text-blue-500' },
  { status: 'klaar',    label: 'Klaar',    iconName: 'circle-check',  textClass: 'text-green-500', isCollapsed: true },
]

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  urgent:  { label: 'Urgent!',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  hoog:    { label: 'Hoog',     color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  normaal: { label: 'Normaal',  color: '#919193', bg: 'rgba(145,145,147,0.12)' },
  laag:    { label: 'Laag',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
}

// Icon per prioriteit — matcht de Figma. 'normaal' toont geen icoon (zie callers).
export const PRIORITY_ICON: Record<TaskPriority, string> = {
  urgent:  'triangle-exclamation',
  hoog:    'signal-bars',
  normaal: 'circle-dashed',
  laag:    'scrubber',
}
