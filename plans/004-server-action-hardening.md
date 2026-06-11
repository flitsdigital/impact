# Plan 004: Harden server actions (auth gap, swallowed errors, filename sanitization)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- "app/(app)/projecten/actions.ts" "app/(app)/content/actions.ts"`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (003 gives you `pnpm test`/`pnpm typecheck` if it landed)
- **Category**: bug / security
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

Three classes of small-but-real defects in the server actions:

1. **`addComment` is the only mutation without an auth guard.** Every other
   action calls `requireAuth`; this one inserts with `author_id: user?.id ?? null`,
   so an expired-session request creates an authorless comment instead of a
   clean "Niet ingelogd." error.
2. **Delete/insert results are silently discarded** in several multi-step
   mutations. If the delete in `setProjectAssignees` fails, the code falls
   through to the insert and the UI reports success while the data is now a
   merge of old+new assignees.
3. **Uploaded filenames go into storage paths unsanitized**
   (`${projectId}/${Date.now()}-${file.name}`) — spaces, `#`, `?`, emoji or
   path separators in a filename produce broken or surprising object keys.

All fixes are local, mechanical, and follow patterns already present in the
same files.

## Current state

All in `app/(app)/projecten/actions.ts` unless noted. The file starts with
`'use server'` and defines the canonical auth pattern at lines 9–13:

```ts
async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Niet ingelogd.')
  return user
}
```

…and every guarded action uses:
`try { await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }`

**(a) `addComment`, lines 240–258 — missing the guard:**

```ts
export async function addComment(
  taskId: string,
  inhoud: string,
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, author_id: user?.id ?? null, inhoud })
    ...
```

**(b) Unchecked delete in `setProjectAssignees`, line 111:**

```ts
await supabase.from('project_assignees').delete().eq('project_id', projectId)

if (profileIds.length === 0) return {}

const { error } = await supabase.from('project_assignees').insert(...)
```

The same pattern exists in `setTaskAssignees` (locate by symbol name; the
delete is on `task_assignees` filtered by `task_id`), in `toggleFavorite`
(lines 89–98: both the `delete()` and the `insert()` results unchecked), and
in `app/(app)/content/actions.ts:139` inside `updatePost`:

```ts
// Replace assignees atomically
await supabase.from('post_assignees').delete().eq('post_id', id)
```

**(c) `uploadProjectFile`, lines 316–338 (path built at 326):**

```ts
const file = formData.get('file')
if (!(file instanceof File)) return { error: 'Geen bestand ontvangen.' }

const path = `${projectId}/${Date.now()}-${file.name}`
```

There is no server-side size limit. The UI (`components/projecten/BijlageModal.tsx`)
restricts the picker client-side, but the action accepts anything.

Note (verified, NOT in scope): `post_logs.action` has no CHECK constraint, so
the `'rescheduled'` action value used by `updatePostDate` is fine.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Lint      | `npx eslint .`           | no NEW errors vs. baseline (36 problems) |
| Build     | `pnpm build`             | exit 0              |
| Tests     | `pnpm test` (only if plan 003 landed) | all pass |

## Scope

**In scope** (the only files you should modify):
- `app/(app)/projecten/actions.ts`
- `app/(app)/content/actions.ts`

**Out of scope** (do NOT touch):
- RLS policies / migrations — authorization architecture is a separate track.
- `app/(app)/klanten/actions.ts` and `app/(app)/timeline/actions.ts` —
  already check their errors.
- Client components calling these actions — return shapes do not change.
- Wrapping delete+insert in a Postgres transaction/RPC — over-engineering for
  this codebase today; error-check-and-return is the agreed fix.

## Git workflow

- Branch: `advisor/004-server-action-hardening`
- Commit style: e.g. `fix(actions): auth-guard addComment, error-checks en bestandsnaam-sanitering`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Auth-guard addComment

In `addComment` (projecten/actions.ts:240-258), replace

```ts
const { data: { user } } = await supabase.auth.getUser()
```

with the canonical pattern, and make the author non-nullable:

```ts
let user
try { user = await requireAuth(supabase) } catch { return { error: 'Niet ingelogd.' } }
```

…and in the insert: `author_id: user.id`. Also reject empty input at the top
(matches the Dutch error style used elsewhere):

```ts
if (!inhoud.trim()) return { error: 'Reactie mag niet leeg zijn.' }
```

**Verify**: `npx tsc --noEmit` → exit 0;
`grep -n "user?.id ?? null" "app/(app)/projecten/actions.ts"` → no matches

### Step 2: Check the discarded delete/insert results

Apply the same mechanical change at each location. Pattern:

```ts
const { error: deleteError } = await supabase
  .from('project_assignees').delete().eq('project_id', projectId)
if (deleteError) return { error: deleteError.message }
```

Locations:
1. `setProjectAssignees` — the `project_assignees` delete (line 111).
2. `setTaskAssignees` — the `task_assignees` delete (find by symbol).
3. `toggleFavorite` (lines 89–98) — capture errors from BOTH branches
   (`delete()` and `insert()`); on error return `{ error: error.message }`.
4. `content/actions.ts` `updatePost` — the `post_assignees` delete (line 139)
   AND the subsequent insert (lines 142–145).
5. `content/actions.ts` `createPost` — the `post_assignees` insert
   (lines 76–79).

Leave the `post_logs` audit inserts (`createPost:82`, `updatePost:147`,
`updatePostStatus:169`, `updatePostDate:194`) as fire-and-forget — a failed
audit log should not fail the user's mutation. This is a deliberate decision;
do not "fix" them.

**Verify**: `npx tsc --noEmit` → exit 0, and each location now has an
`if (...) return { error: ... }` within 3 lines of its delete/insert.

### Step 3: Sanitize the uploaded filename and enforce a size limit

In `uploadProjectFile` (projecten/actions.ts:316-338), before building the path:

```ts
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB — matches the UI limit
if (file.size > MAX_UPLOAD_BYTES) return { error: 'Bestand is groter dan 20 MB.' }

// Keep letters/digits/dot/dash/underscore; collapse the rest to '-'
const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 100)
const path = `${projectId}/${Date.now()}-${safeName || 'bestand'}`
```

Do NOT add a MIME/extension whitelist in this plan — the product owner has
not specified allowed types, and the UI currently decides. Note it as a
follow-up in your report.

**Verify**: `npx tsc --noEmit` → exit 0;
`grep -n 'Date.now()}-\${file.name}' "app/(app)/projecten/actions.ts"` → no matches

### Step 4: Full check

**Verify**: `pnpm build` → exit 0; `npx eslint .` → problem count ≤ 36
(`npx eslint . 2>&1 | tail -3` shows the total); if plan 003 landed:
`pnpm test` → pass.

## Test plan

If plan 003 has landed, add `lib/sanitize-filename` is NOT extracted (the
regex lives inline) — so the testable surface is thin by design. Optional but
welcome: extract the two sanitize lines into `lib/files.ts` as
`safeFileName(name: string): string` and add `lib/files.test.ts` covering:
spaces (`"mijn rapport.pdf"` → `"mijn-rapport.pdf"`), path traversal
(`"../../etc/passwd"` → `"etc-passwd"` — note leading dots/dashes stripped),
emoji, a 200-char name (truncated to 100), and empty result fallback. If plan
003 has NOT landed, skip tests; the grep gates above suffice.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0; `pnpm build` exits 0
- [ ] `grep -c "requireAuth" "app/(app)/projecten/actions.ts"` increased by 1 (addComment now guarded)
- [ ] No `user?.id ?? null` remains in projecten/actions.ts
- [ ] All 5 delete/insert locations from Step 2 check their error
- [ ] Upload path uses sanitized name + 20 MB server-side limit
- [ ] Lint problem count ≤ 36; no files outside the in-scope list modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `task_comments.author_id` has a constraint or trigger that breaks when it
  stops receiving null (unlikely — it's nullable per migration 006) — check
  the migration if the insert starts failing.
- Any client component turns out to RELY on authorless comments (grep
  `author_id` in `components/` first if unsure).
- You are tempted to restructure the actions file, add zod everywhere, or
  introduce a transaction helper — out of scope; this plan is surgical.

## Maintenance notes

- New server actions should copy the `requireAuth` + checked-error pattern;
  the next reviewer should reject any new `await supabase...delete()` whose
  result is discarded (except post_logs audit writes — documented exception).
- Follow-up explicitly deferred: MIME/extension whitelist for uploads (needs
  a product decision on allowed types), and per-resource authorization
  (IDOR-hardening) which only matters once RLS becomes role/tenant-scoped.
- If plan 002 (private bucket) landed first, `uploadProjectFile` returns a
  path instead of a public URL — Step 3 composes cleanly with that; the
  `safeName` goes into the same template literal.
