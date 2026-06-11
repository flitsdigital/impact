# Plan 006: Add create/edit/delete for klant_facturen on the timeline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- "app/(app)/timeline" components/facturatie types/factuur.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

The `klant_facturen` table (migration 005) models project/one-off invoice
milestones with a full lifecycle — `label`, `amount`, `percentage`,
`due_date`, `status (planned|sent|paid|overdue)`, `invoice_number`,
`sent_at`, `paid_at`. The timeline UI **renders** these milestones and can
**cycle their status** (`cycleFactuurStatus`), but there is no way to
*create, edit, or delete* a factuur-milestone anywhere in the app — rows can
only exist if inserted directly into the database. This plan completes the
loop: three server actions plus a modal, following existing patterns exactly.

## Current state

- `supabase/migrations/005_facturatie.sql` — table (no schema change needed):

```sql
create table if not exists public.klant_facturen (
  id              uuid primary key default gen_random_uuid(),
  klant_id        uuid not null references public.klanten(id) on delete cascade,
  label           text not null,                -- "Aanbetaling 50%", "Oplevering"
  amount          numeric not null,
  percentage      numeric,
  due_date        date not null,
  status          text not null default 'planned'
                    check (status in ('planned', 'sent', 'paid', 'overdue')),
  invoice_number  text,
  sent_at         timestamptz,
  paid_at         timestamptz,
  ...
);
```

- `app/(app)/timeline/actions.ts` — existing actions to extend (the file
  already has `requireAuth`, `revalidatePath('/timeline')`, and the
  `{ error?: string }` return convention). `cycleFactuurStatus` shows the
  exact update style:

```ts
export async function cycleFactuurStatus(
  factuurId:     string,
  currentStatus: FactuurStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
  const newStatus = FACTUUR_STATUS_NEXT[currentStatus]
  const update: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'sent') update.sent_at = new Date().toISOString()
  if (newStatus === 'paid') update.paid_at = new Date().toISOString()
  const { error } = await supabase.from('klant_facturen').update(update).eq('id', factuurId)
  if (error) return { error: error.message }
  revalidatePath('/timeline')
  return {}
}
```

- Zod validation exemplar: `app/(app)/klanten/actions.ts:7-17` (`klantSchema`
  with `z.object`, imported as `import { z } from 'zod/v4'`, `safeParse`,
  first-issue error message in Dutch).

- `components/facturatie/FacturatieTijdlijn.tsx` (895 lines, `'use client'`) —
  the rendering surface. Key facts:
  - Props: `{ klanten: KlantBilling[] }`; local state
    `const [klanten, setKlanten] = useState(initialKlanten)` synced via
    effect (line ~238).
  - `getComputedInvoices(klant, until)` (line 104) maps
    `klant.klant_facturen` to `ComputedInvoice` items for project/one-off
    klanten (line 119–120).
  - `handleCycleStatus(factuurId, klantId, currentStatus)` (line 389) shows
    the optimistic-update + `startTransition(() => { serverAction() })`
    pattern used in this file. Follow it for delete.
  - Desktop rows render per-klant around line 650
    (`const invoices = getComputedInvoices(klant, timelineEnd)`); a mobile
    list exists around line 530. `MobileRow` (line 188) is the small
    row-component exemplar.
  - The timeline page (`app/(app)/timeline/page.tsx`) selects
    `klant_facturen (...)` nested under klanten — new rows appear after
    `revalidatePath('/timeline')` without query changes.

- Types: `types/factuur.ts` exports `KlantFactuur`, `FactuurStatus`,
  `FACTUUR_STATUS_CONFIG` (labels/colors). No type changes needed.

- UI building blocks available in `components/ui/`: `Dialog.tsx`,
  `AppDrawer.tsx`, `Input.tsx`, `Label.tsx`, `Button.tsx`, `DatePicker.tsx`,
  `Select.tsx`. The repo's newest form-in-overlay exemplar is
  `components/projecten/NieuweTaakDrawer.tsx` (controlled `useState` per
  field, `handleSubmit` calling a server action, `error` state, sonner
  `toast`). **Heads-up from project memory**: base-ui Select/popups inside a
  vaul Drawer need `pointer-events-auto`; existing drawers already handle
  this — copy an existing drawer's structure rather than composing from
  scratch.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm build`             | exit 0              |
| Lint      | `npx eslint .`           | no NEW errors vs. baseline (36 problems) |
| Tests     | `pnpm test` (only if plan 003 landed) | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `app/(app)/timeline/actions.ts` (extend)
- `components/facturatie/FactuurModal.tsx` (create)
- `components/facturatie/FacturatieTijdlijn.tsx` (wire-in only: open-modal
  affordances + delete handler; do not restructure the timeline math)

**Out of scope** (do NOT touch):
- The recurring-invoice flow (`invoice_records` JSONB, `toggleInvoiceRecord`)
  — legacy but functioning; consolidation is a future decision.
- `supabase/migrations/` — no schema changes.
- Invoice PDF generation, e-mail sending, `overdue` automation — explicitly
  future work.
- `types/factuur.ts` — types already match the table.

## Git workflow

- Branch: `advisor/006-facturatie-crud`
- Commit style: e.g. `feat(facturatie): facturen aanmaken, bewerken en verwijderen op timeline`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Server actions

In `app/(app)/timeline/actions.ts`, add a zod schema (import
`{ z } from 'zod/v4'` like klanten/actions.ts does) and three actions:

```ts
const factuurSchema = z.object({
  klant_id:       z.string().uuid(),
  label:          z.string().min(1, 'Label is verplicht'),
  amount:         z.number().positive('Bedrag moet groter dan 0 zijn'),
  percentage:     z.number().min(0).max(100).nullable().optional(),
  due_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum'),
  invoice_number: z.string().nullable().optional(),
})

export async function createKlantFactuur(input: z.infer<typeof factuurSchema>): Promise<{ error?: string; id?: string }>
export async function updateKlantFactuur(factuurId: string, input: Partial<z.infer<typeof factuurSchema>>): Promise<{ error?: string }>
export async function deleteKlantFactuur(factuurId: string): Promise<{ error?: string }>
```

Each follows the file's existing skeleton: `createClient()` → `requireAuth`
guard returning `{ error: 'Niet ingelogd.' }` → `safeParse` (create: full
schema; update: `factuurSchema.partial().omit({ klant_id: true })`) → insert/
update/delete with checked error → `revalidatePath('/timeline')`. Status is
NOT settable through these actions (it stays `planned` on create;
`cycleFactuurStatus` owns transitions).

**Verify**: `npx tsc --noEmit` → exit 0

### Step 2: FactuurModal component

Create `components/facturatie/FactuurModal.tsx` (`'use client'`), modeled
structurally on `components/projecten/NieuweTaakDrawer.tsx` (read it first —
copy its open/close prop shape, field state, submit/error handling, and
overlay component choice so the styling matches). Props:

```ts
interface FactuurModalProps {
  open: boolean
  onClose: () => void
  klantId: string
  klantNaam: string
  factuur?: KlantFactuur   // present = edit mode, absent = create mode
}
```

Fields: `label` (Input), `amount` (Input type number, parse with `Number()`),
`percentage` (Input, optional), `due_date` (DatePicker — see
`components/ui/DatePicker.tsx` for its value contract), `invoice_number`
(Input, optional). Submit calls `createKlantFactuur` or `updateKlantFactuur`;
on success: `toast.success(...)` (sonner, as in NieuweTaakDrawer), close, and
`router.refresh()`. Show `result.error` inline like the exemplar does. Labels
in Dutch: "Label", "Bedrag (€)", "Percentage", "Vervaldatum", "Factuurnummer".

**Verify**: `npx tsc --noEmit` → exit 0

### Step 3: Wire into FacturatieTijdlijn

In `components/facturatie/FacturatieTijdlijn.tsx`:

1. Add modal state:
   `const [factuurModal, setFactuurModal] = useState<{ klant: KlantBilling; factuur?: KlantFactuur } | null>(null)`
   and render `<FactuurModal …/>` once at the root (open when state non-null).
2. **Create affordance**: in the desktop per-klant row (the block around line
   650 where `getComputedInvoices(klant, …)` is called), for klanten whose
   `type !== 'recurring'`, add a small "+" button (use `Button` size sm or an
   icon button consistent with the file's existing controls) that opens the
   modal in create mode for that klant.
3. **Edit/delete affordance**: the milestone dots/labels for
   project/one-off invoices already have a click handler
   (`handleCycleStatus`). Do NOT overload that click. Add a secondary
   affordance — e.g. a small edit icon shown on row hover next to the
   milestone label, or a context strip in the existing tooltip/row UI —
   whichever the file's current row markup supports with the least
   restructuring. Edit opens the modal pre-filled; delete calls
   `deleteKlantFactuur` after a `window.confirm('Factuur verwijderen?')`,
   with the optimistic-update + `startTransition` pattern copied from
   `handleCycleStatus` (line 389).

**Verify**: `npx tsc --noEmit` → exit 0; `pnpm build` → exit 0;
`npx eslint . 2>&1 | tail -3` → total ≤ 36 problems.

### Step 4: Manual smoke test

With a dev server and a project/one-off klant on `/timeline`:
create a factuur (appears on the timeline after refresh) → edit its label →
cycle its status (existing dot-click still works) → delete it.

**Verify**: all four operations succeed; recurring klanten show no "+"
button.

## Test plan

If plan 003 landed: add `app/(app)/timeline/factuur-schema.test.ts`-style
coverage only if you extract the schema to a plain (non-`'use server'`) file
— importing a `'use server'` module in vitest may fail. Simplest: move
`factuurSchema` to `types/factuur.ts` (it's a types/constants file, already
imported by both sides) and test: valid input passes; empty label fails;
amount 0 fails; bad date format fails; percentage 150 fails. Otherwise rely
on the manual smoke test.

## Done criteria

- [ ] `npx tsc --noEmit`, `pnpm build` exit 0; lint ≤ 36 problems
- [ ] Three new exports in timeline/actions.ts, each with requireAuth + checked errors + revalidatePath
- [ ] `FactuurModal.tsx` exists; create & edit modes work against a real klant
- [ ] Delete requires confirmation and removes the row
- [ ] `cycleFactuurStatus` flow unchanged (dot click still cycles)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The row markup around line 650 has changed so much that there is no obvious
  place for the affordances — propose a location in your report with a
  screenshot/snippet instead of restructuring the timeline.
- DatePicker's value contract doesn't match `due_date`'s `YYYY-MM-DD` string
  (check how NieuweTaakDrawer feeds it) — report the mismatch.
- You find yourself modifying `getComputedInvoices` or the recurring-cycle
  math — out of scope.
- RLS rejects the insert (it shouldn't — authenticated users have full access
  per migration 005).

## Maintenance notes

- `overdue` status is currently never set automatically; when someone builds
  that (cron or computed-on-read), `FACTUUR_STATUS_NEXT.overdue = 'sent'`
  already defines its transition.
- The legacy `invoice_records` JSONB flow and this table coexist; a future
  consolidation should migrate recurring records into `klant_facturen` —
  these actions are written so that adding a `type` discriminator later is
  additive.
- Reviewer: check the modal is rendered ONCE at the timeline root (not per
  row — 50 klanten would mean 50 mounted modals).
