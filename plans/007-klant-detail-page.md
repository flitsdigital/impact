# Plan 007: Build the klant detail page (/klanten/[id]) — fixes a live dead link

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- "app/(app)/klanten" components/klanten types/klant.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

`components/klanten/KlantenTable.tsx:280-285` already renders every klant
name as `<Link href={`/klanten/${klant.id}`}>` — **but that route does not
exist**, so every click in the klanten table lands on a 404. Beyond the dead
link, this is the core CRM gap: contact details, the klant's projects, and
its invoices live in three different modules with no single per-klant view.
This plan builds `/klanten/[id]` following the established `/projecten/[id]`
pattern, plus the missing `updateKlant` server action so contact fields are
editable.

## Current state

- **The dead link** — `components/klanten/KlantenTable.tsx:280-285`:

```tsx
<Link
  href={`/klanten/${klant.id}`}
  ...
>
```

- `app/(app)/klanten/` today contains only `page.tsx` (list) and
  `actions.ts`. **`actions.ts` has `createKlant` and `deleteKlant` but NO
  `updateKlant`** (verified by grep on 2026-06-11). The zod exemplar to reuse
  is in that same file:

```ts
const klantSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht'),
  type: z.enum(['recurring', 'project', 'one-off']),
  contactpersoon: z.string().optional(),
  status: z.enum(['actief', 'gepauzeerd', 'gearchiveerd']).default('actief'),
  volgende_factuur: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telefoon: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notities: z.string().optional().nullable(),
})
```

- **Server-component exemplar**: `app/(app)/projecten/[id]/page.tsx` — params
  as `Promise<{ id: string }>`, `createClient()` from
  `@/lib/supabase/server`, `.single()` + `notFound()` on miss, then renders a
  `'use client'` module component. Match this structure exactly.

- Data available per klant:
  - `klanten` row — contact fields (`contactpersoon`, `email`, `telefoon`,
    `website`, `notities`) + billing columns from migration 005
    (`billing_cycle`, `price_per_cycle`, `invoice_records`, …). Type:
    `types/klant.ts` (`Klant`) and `types/factuur.ts` (`KlantBilling`).
  - `projects` — has `klant_id` FK; query
    `.from('projects').select('id, naam, status, deadline, kleur').eq('klant_id', id)`.
  - `klant_facturen` — has `klant_id` FK (see `types/factuur.ts`
    `KlantFactuur`).
  - `posts` — has `klant_id` FK (content per klant; optional section).

- UI conventions: `PageHeader` (`components/layout/PageHeader.tsx`) for the
  title row; `Card`, `Badge`, `Button`, `Input`, `Textarea` in
  `components/ui/`; status/type chips for klanten exist inside
  `KlantenTable.tsx` — copy the chip styling from there rather than invent
  new colors. Inline-edit exemplar: `ProjectDetailModule.tsx` does inline
  beschrijving editing (commit `7fe7ee2`) — borrow that interaction for
  `notities` if convenient, otherwise a simple edit-drawer is fine.
  `KlantToevoegenModal.tsx` (components/klanten/) is the existing
  klant-form exemplar — reuse its field layout for the edit form.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm build`             | exit 0              |
| Lint      | `npx eslint .`           | no NEW errors vs. baseline (36 problems) |
| Tests     | `pnpm test` (only if plan 003 landed) | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `app/(app)/klanten/[id]/page.tsx` (create)
- `components/klanten/KlantDetailModule.tsx` (create)
- `app/(app)/klanten/actions.ts` (add `updateKlant` only)

**Out of scope** (do NOT touch):
- `components/klanten/KlantenTable.tsx` — the link already points to the
  right place.
- Factuur-CRUD on this page — plan 006 owns factuur mutations; this page may
  LINK to `/timeline` but must not duplicate the modal.
- A `klant_notes`/activity-log table — future work, no migrations here.
- Editing billing-cycle fields (`billing_cycle`, `price_per_cycle`, …) —
  those are managed via the timeline/klant-modal flows; display read-only.

## Git workflow

- Branch: `advisor/007-klant-detail-page`
- Commit style: e.g. `feat(klanten): klant-detailpagina met projecten en facturatie`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: updateKlant server action

In `app/(app)/klanten/actions.ts`, add:

```ts
export async function updateKlant(
  id: string,
  input: unknown,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }

  const parsed = klantSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validatiefout' }
  }

  const { error } = await supabase.from('klanten').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/klanten')
  revalidatePath(`/klanten/${id}`)
  return {}
}
```

**Verify**: `npx tsc --noEmit` → exit 0

### Step 2: Server component page

Create `app/(app)/klanten/[id]/page.tsx` mirroring
`app/(app)/projecten/[id]/page.tsx`'s shape:

- `params: Promise<{ id: string }>`, await it.
- Fetch in parallel (avoid the sequential-await waterfall the projecten page
  has — use `Promise.all`):

```ts
const [klantRes, projectsRes, facturenRes] = await Promise.all([
  supabase.from('klanten').select('*').eq('id', id).single(),
  supabase.from('projects').select('id, naam, status, kleur, deadline, project_number').eq('klant_id', id).order('created_at', { ascending: false }),
  supabase.from('klant_facturen').select('*').eq('klant_id', id).order('due_date', { ascending: true }),
])
if (klantRes.error || !klantRes.data) notFound()
```

- Render `<KlantDetailModule klant={...} projects={...} facturen={...} />`.

**Verify**: `npx tsc --noEmit` → exit 0

### Step 3: KlantDetailModule

Create `components/klanten/KlantDetailModule.tsx` (`'use client'`). Layout —
match the visual language of `ProjectDetailModule.tsx` (header + sectioned
content), Dutch labels:

1. **Header**: klant naam + type/status chips (copy chip markup from
   `KlantenTable.tsx`), back-link to `/klanten`.
2. **Contactgegevens** card: contactpersoon, email (mailto link), telefoon
   (tel link), website (external link), notities. An "Bewerken" button opens
   an edit form (reuse the field layout from `KlantToevoegenModal.tsx`; a
   simple Dialog/AppDrawer with the same Input/Textarea fields) that submits
   via `updateKlant` and `router.refresh()` on success, sonner toast like the
   rest of the app.
3. **Projecten** card: list the passed projects — name (Link to
   `/projecten/${p.id}`), status chip, deadline. Empty state: "Nog geen
   projecten." (match empty-state styling used in ProjectenModule).
4. **Facturatie** card: read-only list of `klant_facturen` (label, amount in
   EUR, due_date, status chip using `FACTUUR_STATUS_CONFIG` from
   `types/factuur.ts`) + a Link "Bekijk op timeline" → `/timeline`. For
   recurring klanten without facturen, show billing summary (cycle +
   price_per_cycle) read-only.

**Verify**: `npx tsc --noEmit` → exit 0; `pnpm build` → exit 0;
`npx eslint . 2>&1 | tail -3` → ≤ 36 problems

### Step 4: Manual smoke test

Dev server: from `/klanten`, click a klant name → detail page renders (no
404). Edit a contact field → persists after refresh. Klant with projects
shows them; klant without shows the empty state. Nonexistent id
(`/klanten/00000000-0000-0000-0000-000000000000`) → 404 page.

**Verify**: all four checks pass.

## Test plan

If plan 003 landed: the only cheaply testable unit is `updateKlant`'s schema
behavior, which lives behind `'use server'` — skip unit tests rather than
fight the loader; the smoke test in Step 4 is the gate. (Schema extraction to
a shared file is a refactor deliberately not bundled into this plan.)

## Done criteria

- [ ] `/klanten/[id]` route exists; clicking a klant in the table no longer 404s
- [ ] `updateKlant` exists with requireAuth + partial zod validation + checked error
- [ ] Page fetches klant/projects/facturen via one `Promise.all` (no sequential waterfall)
- [ ] Unknown id → `notFound()`
- [ ] `npx tsc --noEmit`, `pnpm build` exit 0; lint ≤ 36 problems
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `KlantenTable.tsx` no longer contains the `/klanten/${klant.id}` link
  (drifted) — the page is still worth building, but confirm the entry point
  first.
- The `klanten` select('*') trips over a column missing in the deployed DB
  (migration 005 not applied) — report; do not write defensive try/catch
  blocks around every column like the projecten page does.
- You want to add factuur create/edit here — that's plan 006's modal; link to
  the timeline instead.

## Maintenance notes

- When plan 006 lands, consider mounting its `FactuurModal` here too — the
  modal was designed klant-scoped, so this page can host it with zero changes
  to the modal.
- A future activity/notes timeline per klant (klant_notes table) would slot
  in as a fifth card; keep the module's sections independent.
- Reviewer: check the page uses `Promise.all` (the older projecten detail
  page's sequential pattern is the anti-exemplar) and that no billing fields
  became editable.
