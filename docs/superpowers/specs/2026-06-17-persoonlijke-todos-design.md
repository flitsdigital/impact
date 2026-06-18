# Persoonlijke todo's — ontwerp

> Datum: 2026-06-17 · Branch: `feat/taken-prototype` · Status: ter review

## 1. Doel

Een **snelle, persoonlijke todo-lijst** die overal in de CRM bereikbaar is via een
drawer. Los van de bestaande project-`taken` (kanban/lijst). Per todo kun je een
**datum**, **prioriteit** en **één of meer teamleden** koppelen.

Gekozen vormgeving uit het prototype (`/taken-prototype` + `/taken-prototype/pickers`):
- **Rij:** variant **B** — gestapeld (titel boven, meta eronder, tweede regel mogelijk).
- **Datum-picker:** **D2** — snelkoppelingen (vandaag/morgen/volgende week) + kalender.
- **Prioriteit-picker:** **P3** — inline flags, één tik.
- **Teamlid-picker:** **T2** — dropdown met avatars, multi-select.

## 2. Scope

**Wel:** eigen lijst per gebruiker, quick-add, afvinken, datum/prioriteit/teamleden
zetten, bewerken, verwijderen, globale drawer + sneltoets, een toegewezen teamlid
ziet de todo in zijn eigen lijst.

**Niet (YAGNI, later):** subtaken, notificaties bij toewijzing, herhalende todo's,
slepen-sorteren, koppelen aan klant/project, bijlagen, commentaar.

## 3. Datamodel — `supabase/migrations/016_todos.sql`

```sql
create table public.todos (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  titel       text        not null,
  notitie     text,
  done        boolean     not null default false,
  deadline    date,
  prioriteit  text        not null default 'normaal'
                          check (prioriteit in ('urgent','hoog','normaal','laag')),
  volgorde    int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.todo_assignees (
  todo_id     uuid not null references public.todos(id)    on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (todo_id, profile_id)
);

create index todos_user_idx          on public.todos(user_id);
create index todo_assignees_prof_idx on public.todo_assignees(profile_id);
```

**RLS — afwijking van de app-conventie.** De rest van de app gebruikt
`for all to authenticated using (true)` (interne tool, alle staf vertrouwd). Jij koos
"alleen ikzelf", dus todos krijgen **owner+assignee-scoping**:

```sql
alter table public.todos          enable row level security;
alter table public.todo_assignees enable row level security;

-- zichtbaar/bewerkbaar voor de maker óf een toegewezen teamlid
create policy "todos owner or assignee" on public.todos for all to authenticated
  using ( user_id = auth.uid()
          or exists (select 1 from public.todo_assignees a
                     where a.todo_id = todos.id and a.profile_id = auth.uid()) )
  with check ( user_id = auth.uid() );

create policy "todo_assignees via owner" on public.todo_assignees for all to authenticated
  using ( exists (select 1 from public.todos t
                  where t.id = todo_assignees.todo_id
                        and (t.user_id = auth.uid() or todo_assignees.profile_id = auth.uid())) )
  with check ( exists (select 1 from public.todos t
                       where t.id = todo_assignees.todo_id and t.user_id = auth.uid()) );
```

> **Afhankelijkheid om te verifiëren:** dit veronderstelt dat `profiles.id = auth.uid()`
> (standaard Supabase-patroon). Te checken in migratie `003`. Klopt dat niet, dan
> scopen we via een `profiles`-lookup op `auth.uid()`.

## 4. Types — `types/todo.ts`

```ts
import type { TaskPriority } from '@/types/project'   // hergebruik PRIORITY_CONFIG/_ICON

export interface Todo {
  id: string; user_id: string; titel: string; notitie: string | null
  done: boolean; deadline: string | null; prioriteit: TaskPriority
  volgorde: number; created_at: string; updated_at: string
}
export interface TodoWithAssignees extends Todo {
  assignees: { profile_id: string; profiles: { id: string; full_name: string | null; avatar_url: string | null } }[]
}
```

`PRIORITY_CONFIG` / `PRIORITY_ICON` uit `types/project.ts` blijven de bron voor
prioriteit-kleuren en -iconen (geen tweede mapping).

## 5. Architectuur & dataflow

Een globale drawer die op elke pagina te openen is. Omdat hij app-breed is en
mutaties niet elke route mogen revalideren, kiezen we **client-state met
optimistische updates** i.p.v. server-component-revalidatie:

- **Provider** `components/todos/TakenProvider.tsx` (`'use client'`), gemount in
  `app/(app)/layout.tsx`. Houdt `open`-state + de todo-lijst vast en biedt
  `useTaken()` (open/close + acties). Zo kan elke knop de drawer openen.
- **Eerste load:** bij de eerste keer openen haalt de provider de todo's op via een
  server action (`getTodos`). Niet in de layout zelf — anders fetcht elke navigatie.
- **Mutaties:** server actions in `app/(app)/_actions/todos.ts`
  (`createTodo`, `toggleDone`, `updateTodo`, `setAssignees`, `deleteTodo`). Elke actie
  doet optimistische update in de provider; bij fout rollback + toast.

Lijst-query (`getTodos`): todo's waar ik **owner óf assignee** ben, met assignees
ge-joined, gesorteerd `done asc, volgorde asc, created_at desc`.

## 6. UI-componenten

Gedeelde componenten (krijgen elk een `DemoBlock` op `/design-system` + inventaris-rij
in `docs/DESIGN-SYSTEM.md`, conform de onderhoudsregel):

| Component | Pad | Rol |
|---|---|---|
| `TakenDrawer` | `components/todos/TakenDrawer.tsx` | De drawer-inhoud: kop "Mijn taken", quick-add-rij bovenaan, lijst met `TodoRow`'s eronder. Bouwt op `AppDrawer`. |
| `TodoRow` | `components/todos/TodoRow.tsx` | Variant-B-rij: ronde checkbox, titel (+notitie), meta-regel. Meta-pills zijn klikbaar → openen de bijbehorende picker (inline bewerken). |
| `DateShortcutsPicker` | `components/todos/DateShortcutsPicker.tsx` | D2 — promoveren uit prototype. Pill-trigger → popover met snelkoppelingen + `Calendar` + wissen. |
| `PriorityFlags` | `components/todos/PriorityFlags.tsx` | P3 — vier inline flag-knoppen. |
| `AssigneeDropdown` | `components/todos/AssigneeDropdown.tsx` | T2 — `DropdownMenu` met avatars, multi-select (functionele toggle — let op de stale-closure-bug uit het prototype). |

Hergebruikt zonder wijziging: `AppDrawer`, `Calendar`, `DropdownMenu`, `Popover`,
`Avatar`/`AvatarStack`, `Button`, `SvgIcon`, `EmptyState`, `lib/dates`.

**Quick-add-gedrag:** titel-input bovenin de drawer; Enter voegt toe. Datum/prioriteit/
teamleden via dezelfde pills naast het invoerveld. Nieuwe todo verschijnt bovenaan.

**Inline bewerken:** in een `TodoRow` opent een tik op de datum-, prioriteit- of
avatar-pill direct de bijbehorende picker; wijziging = optimistische update. Titel
bewerken: dubbelklik/▸ klein potlood (detail-beslissing voor het plan).

## 7. Globale toegang

- Knop in de topbar (`components/layout/…` — naast Zoeken) met taken-icoon → opent de drawer.
- Sneltoets. `⌘T` is al de Taken-pagina; voorstel **`⌘ ⇧ T`** of een losse toets.
  (Definitieve keuze in het plan / bij review.)
- De `TakenProvider` mount de drawer één keer in de app-shell, dus hij is overal gelijk.

## 8. Aannames & open beslissingen (voor de review)

1. **RLS-privacy** zoals in §3 (owner+assignee). Alternatief = app-conventie
   `using(true)` + alleen query-scoping. Akkoord met de strengere variant?
2. **`profiles.id = auth.uid()`** — verifiëren in migratie 003 (zie §3-notitie).
3. **Sneltoets** voor de globale drawer (§7) — `⌘ ⇧ T` oké?
4. **Titel inline bewerken** — potlood-knop of dubbelklik (§6).
5. De huidige prototype-routes (`/taken-prototype*`) verwijderen we vóór merge, of
   bewaren als levende referentie? Voorstel: verwijderen.
