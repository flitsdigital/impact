'use client'

import { useState } from 'react'
import { TaakKaart } from '@/components/projecten/TaakKaart'
import { ProjectKaart } from '@/components/projecten/ProjectKaart'
import { TakenLijst } from '@/components/taken/TakenLijst'
import { KanbanBoard } from '@/components/ui/KanbanBoard'
import { TypeBadge, StatusBadge } from '@/components/klanten/KlantBadges'
import { LeadKaart } from '@/components/leads/LeadKaart'
import { LeadsLijst } from '@/components/leads/LeadsLijst'
import { FactuurStatusBadge } from '@/components/facturatie/FactuurStatusBadge'
import { PageHeader, PageToolbar } from '@/components/layout/PageHeader'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Button } from '@/components/ui/Button'
import type { Project, TaskWithRelations, ProjectAssigneeProfile } from '@/types/project'
import { KANBAN_COLUMNS } from '@/types/project'
import type { FactuurStatus } from '@/types/factuur'
import { FACTUUR_STATUS_CONFIG } from '@/types/factuur'
import type { Lead } from '@/types/lead'
import { DemoBlock, SectionHeading } from './DemoBlock'
import { DateShortcutsPicker } from '@/components/todos/DateShortcutsPicker'
import { PriorityFlags } from '@/components/todos/PriorityFlags'
import { AssigneeDropdown } from '@/components/todos/AssigneeDropdown'
import type { TaskPriority } from '@/types/project'

// ─── Mockdata ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<TaskWithRelations>): TaskWithRelations {
  return {
    id: 'demo',
    project_id: 'p1',
    sprint_id: null,
    milestone_id: null,
    parent_id: null,
    task_number: 1,
    titel: 'Demo-taak',
    beschrijving: null,
    status: 'todo',
    prioriteit: 'normaal',
    deadline: null,
    schatting_uren: null,
    gelogde_uren: 0,
    volgorde: 0,
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-01T12:00:00Z',
    project: { id: 'p1', naam: 'Website redesign', kleur: '#0072F5' },
    assignees: [],
    labels: [],
    subtasks: [],
    subtask_done: 0,
    subtask_total: 0,
    ...overrides,
  }
}

const DEMO_ASSIGNEES = [
  { profile_id: 'a1', profiles: { id: 'a1', full_name: 'Jordi Klavers', avatar_url: null, email: null } },
  { profile_id: 'a2', profiles: { id: 'a2', full_name: 'Anna Bakker', avatar_url: null, email: null } },
] satisfies ProjectAssigneeProfile[]

const DEMO_TASKS: TaskWithRelations[] = [
  makeTask({
    id: 't1', task_number: 12, titel: 'Homepage hero bouwen', status: 'bezig',
    prioriteit: 'hoog', deadline: '2026-06-20',
    assignees: DEMO_ASSIGNEES,
    subtasks: [
      makeTask({ id: 't1a', titel: 'Desktop-variant' }),
      makeTask({ id: 't1b', titel: 'Mobiel-variant' }),
    ],
    subtask_done: 1, subtask_total: 2,
  }),
  makeTask({ id: 't2', task_number: 13, titel: 'Contactformulier koppelen', status: 'todo', deadline: '2026-05-30' }),
  makeTask({ id: 't3', task_number: 14, titel: 'SEO-teksten reviewen', status: 'feedback', prioriteit: 'laag' }),
  makeTask({ id: 't4', task_number: 15, titel: 'DNS omzetten', status: 'klaar' }),
]

const DEMO_PROJECT: Project & { klanten?: { id: string; naam: string } | null } = {
  id: 'p1',
  klant_id: 'k1',
  naam: 'Website redesign JHL',
  beschrijving: null,
  status: 'bezig',
  prioriteit: 'hoog',
  kleur: '#0072F5',
  budget: 4500,
  start_date: '2026-06-01',
  deadline: '2026-07-15',
  project_number: 5,
  created_at: '2026-06-01T12:00:00Z',
  updated_at: '2026-06-01T12:00:00Z',
  klanten: { id: 'k1', naam: 'JHL Automotive' },
}

const DEMO_LEADS: Lead[] = [
  {
    id: 'l1', bedrijfsnaam: 'Bakkerij Visser', contactpersoon: 'Pieter Visser',
    email: 'info@bakkerijvisser.nl', telefoon: null, bron: 'website', waarde: 2500,
    notities: null, status: 'offerte',
    created_at: '2026-06-01T12:00:00Z', updated_at: '2026-06-01T12:00:00Z',
  },
  {
    id: 'l2', bedrijfsnaam: 'Garage Jansen', contactpersoon: null,
    email: null, telefoon: null, bron: 'referral', waarde: null,
    notities: null, status: 'nieuw',
    created_at: '2026-06-08T12:00:00Z', updated_at: '2026-06-08T12:00:00Z',
  },
]

// ─── Sectie ───────────────────────────────────────────────────────────────────

const demoMembers = [
  { id: '1', full_name: 'Jordi Klavers', avatar_url: null },
  { id: '2', full_name: 'Sam de Vries', avatar_url: null },
]

export function DomainSection() {
  const [tasks, setTasks] = useState(DEMO_TASKS)
  const [demoDate, setDemoDate] = useState('')
  const [demoPrio, setDemoPrio] = useState<TaskPriority>('hoog')
  const [demoTeam, setDemoTeam] = useState<string[]>([])

  function moveTask(taskId: string, toKey: string) {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status: toKey as TaskWithRelations['status'] } : t,
    ))
  }

  return (
    <section className="flex flex-col gap-8">
      <SectionHeading
        id="domein"
        title="Domein-componenten"
        intro="Samengestelde componenten per module, hier met mockdata. Ze consumeren de atomen hierboven — nieuwe domein-componenten horen óók in dit overzicht."
      />

      <DemoBlock
        title="PageHeader + PageToolbar"
        path="@/components/layout/PageHeader"
        description="Standaard paginakop: icoon + titel links, acties rechts, optionele toolbar eronder. Elke moduleshell gebruikt dit."
        className="flex-col items-stretch p-0"
      >
        <PageHeader
          title="Voorbeeldmodule"
          iconName="chart-kanban"
          actions={
            <Button size="sm" className="gap-1.5">
              <SvgIcon name="plus" size={13} />
              Nieuw item
            </Button>
          }
          toolbar={
            <PageToolbar>
              <span className="text-[12px] text-fg-3">Toolbar-inhoud (bv. SegmentedControl + filters)</span>
            </PageToolbar>
          }
        />
      </DemoBlock>

      <DemoBlock
        title="KlantBadges — TypeBadge · StatusBadge"
        path="@/components/klanten/KlantBadges"
        description="Klanttype (recurring / project / one-off) en klantstatus (actief / gepauzeerd / gearchiveerd)."
      >
        <TypeBadge type="recurring" />
        <TypeBadge type="project" />
        <TypeBadge type="one-off" />
        <StatusBadge status="actief" />
        <StatusBadge status="gepauzeerd" />
        <StatusBadge status="gearchiveerd" />
      </DemoBlock>

      <DemoBlock
        title="FactuurStatusBadge"
        path="@/components/facturatie/FactuurStatusBadge"
        description="Factuurstatus als pill, kleuren uit FACTUUR_STATUS_CONFIG."
      >
        {(Object.keys(FACTUUR_STATUS_CONFIG) as FactuurStatus[]).map((s) => (
          <FactuurStatusBadge key={s} status={s} />
        ))}
      </DemoBlock>

      <DemoBlock
        title="LeadKaart · LeadsLijst"
        path="@/components/leads/{LeadKaart,LeadsLijst}"
        description="Pipeline-kaart en tabel voor leads (LEAD_COLUMNS: nieuw → contact → offerte → gewonnen/verloren). Waarde via formatEur."
        className="flex-col items-start"
      >
        <div className="flex gap-3">
          {DEMO_LEADS.map((l) => (
            <div key={l.id} className="w-64"><LeadKaart lead={l} isDragging={false} /></div>
          ))}
        </div>
        <div className="w-full h-40 overflow-hidden rounded-lg border border-border-subtle">
          <LeadsLijst leads={DEMO_LEADS} onLeadClick={() => {}} />
        </div>
      </DemoBlock>

      <DemoBlock
        title="TaakKaart"
        path="@/components/projecten/TaakKaart"
        description="Kanban-kaart voor taken: AvatarStack, FLT-nummer, prioriteit, subtaken + progressbar, deadline (oranje = verlopen). showProject toont de projectregel."
        className="items-start"
      >
        <div className="w-64"><TaakKaart task={DEMO_TASKS[0]} isDragging={false} showProject /></div>
        <div className="w-64"><TaakKaart task={DEMO_TASKS[1]} isDragging={false} /></div>
      </DemoBlock>

      <DemoBlock
        title="ProjectKaart"
        path="@/components/projecten/ProjectKaart"
        description="Kanban-kaart voor projecten met taak-voortgang."
        className="items-start"
      >
        <div className="w-64">
          <ProjectKaart
            project={DEMO_PROJECT}
            assignees={DEMO_ASSIGNEES}
            taskCounts={{ total: 4, done: 1 }}
            isDragging={false}
          />
        </div>
      </DemoBlock>

      <DemoBlock
        title="KanbanBoard (generiek)"
        path="@/components/ui/KanbanBoard"
        description="Generiek bord: columns + items + renderCard + onMove. Taak-specifieke adapter: @/components/projecten/KanbanBoard. Sleep de kaarten gerust — dit is mockdata."
        className="p-0 h-[420px] overflow-hidden"
      >
        <KanbanBoard
          columns={KANBAN_COLUMNS.map((c) => ({
            key: c.status, label: c.label, iconName: c.iconName, textClass: c.textClass,
          }))}
          items={tasks}
          getItemId={(t) => t.id}
          getColKey={(t) => t.status}
          renderCard={(t, isDragging) => <TaakKaart task={t} isDragging={isDragging} />}
          onMove={moveTask}
          addItemLabel="Taak toevoegen"
        />
      </DemoBlock>

      <DemoBlock
        title="TakenLijst"
        path="@/components/taken/TakenLijst"
        description="Complete takentabel (ID, titel, status, prioriteit, deadline) met optionele projectkolom via showProject."
        className="p-0 h-64 overflow-hidden"
      >
        <TakenLijst tasks={tasks} onTaskClick={() => {}} showProject />
      </DemoBlock>

      <DemoBlock title="DateShortcutsPicker" path="@/components/todos/DateShortcutsPicker"
        description="Datum-picker met snelkoppelingen (vandaag/morgen/volgende week) + kalender. Gebruikt in de Taken-drawer.">
        <DateShortcutsPicker value={demoDate} onChange={setDemoDate} />
      </DemoBlock>

      <DemoBlock title="PriorityFlags" path="@/components/todos/PriorityFlags"
        description="Prioriteit zetten met één tik op een van de vier flags.">
        <PriorityFlags value={demoPrio} onChange={setDemoPrio} />
      </DemoBlock>

      <DemoBlock title="AssigneeDropdown" path="@/components/todos/AssigneeDropdown"
        description="Teamleden toewijzen (multi-select) met avatars.">
        <AssigneeDropdown value={demoTeam} team={demoMembers}
          onToggle={(id) => setDemoTeam((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))} />
      </DemoBlock>
    </section>
  )
}
