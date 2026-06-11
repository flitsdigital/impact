# Plan 001: Stop anonymous read access to all klanten, profiles and posts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- app/preview lib/supabase supabase/migrations middleware.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Note: this plan was written against
> the working tree at commit `4887fcb`, which had uncommitted changes in
> `components/ui/` — none of those touch this plan's scope.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

Migration `004_preview_policy.sql` grants the `anon` Postgres role unrestricted
`SELECT` on **four whole tables** — `posts`, `klanten`, `profiles`, and
`post_assignees` — with `using (true)`. The Supabase anon key is, by design,
embedded in every client-side JavaScript bundle, so **anyone on the internet
can dump the full client list, all team-member profiles, and all social-post
content** via the Supabase REST API, no login required. The policies exist
only so the public `/preview/[id]` page (a share link for a single post) can
render. After this plan, the preview page fetches its data server-side with a
service-role key and the anon policies are gone, so anonymous REST queries
return zero rows.

## Current state

- `supabase/migrations/004_preview_policy.sql` — the four offending policies:

```sql
-- 004_preview_policy.sql:5-26 (all four follow this shape)
create policy "Anon can read posts for preview"
  on public.posts for select
  to anon
  using (true);
-- ... same for public.klanten, public.profiles, public.post_assignees
```

The exact policy names (needed to drop them) are:
`"Anon can read posts for preview"`, `"Anon can read klanten for preview"`,
`"Anon can read profiles for preview"`, `"Anon can read post_assignees for preview"`.

- `app/preview/[id]/page.tsx` — server component, the ONLY consumer of those
  policies. It fetches via the cookie-based anon client:

```tsx
// app/preview/[id]/page.tsx:18-35
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()      // <- lib/supabase/server.ts, anon key

  const { data: post } = await supabase
    .from('posts')
    .select('*, klanten(naam)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  const { data: assigneeRows } = await supabase
    .from('post_assignees')
    .select('profiles(id, full_name, avatar_url, email)')
    .eq('post_id', id)
```

- `lib/supabase/server.ts` — the existing server client factory (anon key +
  cookies). Use it as the structural exemplar for the new admin client:

```ts
// lib/supabase/server.ts:4-9
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ...
```

- `middleware.ts:35` — `/preview` is whitelisted as a public route
  (`pathname.startsWith("/preview")`), so unauthenticated visitors reach the
  page. That stays unchanged.

- Repo conventions: TypeScript, double quotes in `lib/`, no semicolons in
  newer files, Dutch domain names. Migrations are plain numbered `.sql` files
  in `supabase/migrations/`, lowercase SQL, `-- ─── Section ───` comment style.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0, no output   |
| Build     | `pnpm build`             | exit 0              |
| Lint      | `npx eslint .`           | no NEW errors vs. baseline (36 pre-existing problems) |

There is no test runner in this repo yet (plan 003 adds one).

## Scope

**In scope** (the only files you should modify/create):
- `lib/supabase/admin.ts` (create)
- `app/preview/[id]/page.tsx`
- `supabase/migrations/010_drop_anon_preview_policies.sql` (create)
- `.env.example` (create if absent; placeholder names only, NEVER real values)

**Out of scope** (do NOT touch, even though they look related):
- `middleware.ts` — the `/preview` public-route whitelist is correct as-is.
- Storage bucket policies in migrations 002/009 — that is plan 002.
- All other RLS policies (`using (true)` for `authenticated`) — by design for
  this single-team tool; do not "fix" them.
- `lib/supabase/server.ts` and `lib/supabase/client.ts` — every other page
  depends on them.

## Git workflow

- Branch: `advisor/001-anon-rls-exposure`
- Commit style: conventional commits in Dutch/English mix, e.g.
  `fix(security): preview via service-role, drop anon RLS-policies`
  (matches `git log` style like `fix(projecten): bijlage-upload, ...`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the service-role key is available

The service-role key is found in the Supabase dashboard under
Project Settings → API → `service_role`. Check whether `.env.local` already
contains a line starting with `SUPABASE_SERVICE_ROLE_KEY=`:

```bash
grep -c "^SUPABASE_SERVICE_ROLE_KEY=" .env.local || true
```

If the count is `0`, **STOP and report**: the operator must add
`SUPABASE_SERVICE_ROLE_KEY=<value from Supabase dashboard>` to `.env.local`
themselves. Never paste a key value into any committed file or into your
report. The variable name must NOT have the `NEXT_PUBLIC_` prefix (that would
ship it to the browser).

**Verify**: `grep -c "^SUPABASE_SERVICE_ROLE_KEY=" .env.local` → `1`

### Step 2: Create the admin client

Create `lib/supabase/admin.ts`:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client — bypasses RLS. Server-only: never import this from a
 * file with "use client", and never expose its output of secrets.
 * Used exclusively for the public /preview/[id] page, which must read a
 * single post without an authenticated session.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
```

**Verify**: `npx tsc --noEmit` → exit 0

### Step 3: Switch the preview page to the admin client

In `app/preview/[id]/page.tsx`:
- Replace `import { createClient } from '@/lib/supabase/server'` with
  `import { createAdminClient } from '@/lib/supabase/admin'`.
- Replace `const supabase = await createClient()` with
  `const supabase = createAdminClient()` (note: NOT awaited — the admin
  factory is synchronous).

Nothing else on the page changes; both queries (`posts` select at lines
23–27, `post_assignees` select at lines 32–35) work identically through the
service-role client.

**Verify**: `npx tsc --noEmit` → exit 0, and
`grep -c "createAdminClient" "app/preview/[id]/page.tsx"` → `2`

### Step 4: Write the migration dropping the anon policies

Create `supabase/migrations/010_drop_anon_preview_policies.sql`:

```sql
-- ─── Drop anon preview policies ───────────────────────────────────────────────
-- The /preview/[id] page now fetches server-side with the service-role key,
-- so anonymous REST access to these tables is no longer needed (it exposed
-- the full klanten/profiles/posts tables to anyone with the anon key).

drop policy if exists "Anon can read posts for preview"          on public.posts;
drop policy if exists "Anon can read klanten for preview"        on public.klanten;
drop policy if exists "Anon can read profiles for preview"       on public.profiles;
drop policy if exists "Anon can read post_assignees for preview" on public.post_assignees;
```

**Verify**: file exists and `grep -c "drop policy if exists" supabase/migrations/010_drop_anon_preview_policies.sql` → `4`

### Step 5: Apply the migration

If the Supabase CLI is linked (`supabase projects list` works and
`supabase/.temp` or config indicates a linked project), run:

```bash
supabase db push
```

If the CLI is not installed or not linked, **STOP and report**: ask the
operator to run the migration (CLI `supabase db push`, or paste the SQL into
the Supabase dashboard SQL editor). Do not improvise other deployment paths.

**Verify** (only possible once applied — otherwise note as pending in your report):

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/klanten?select=id" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

→ `[]` (empty array — anon sees zero rows). Repeat for `profiles` and `posts`: all `[]`.

### Step 6: Create .env.example

Create `.env.example` (placeholder values only):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Server-only — used by lib/supabase/admin.ts for the public preview page.
# Find it in Supabase dashboard → Project Settings → API → service_role.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Verify**: `git check-ignore .env.local` → prints `.env.local` (still ignored), and `.env.example` contains no real key material (manual inspection: values are the literal placeholders above).

### Step 7: Full verification

Run the build and smoke-test the preview page with a real post id (get one
via the app, or skip the manual check and note it):

```bash
pnpm build
```

**Verify**: `pnpm build` → exit 0. If a dev server check is possible: visit
`/preview/<existing-post-id>` while logged OUT → page renders the post.

## Test plan

No test runner exists yet (plan 003 introduces vitest). Manual verification
gates above stand in for tests. After plan 003 lands, a follow-up test worth
writing: a REST probe script asserting anon gets `[]` from
`klanten`/`profiles`/`posts` (document this in plans/README.md follow-ups).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc --noEmit` exits 0
- [ ] `pnpm build` exits 0
- [ ] `grep -rn "createClient" "app/preview/[id]/page.tsx"` returns no matches (only `createAdminClient` is used)
- [ ] `supabase/migrations/010_drop_anon_preview_policies.sql` exists with 4 `drop policy if exists` statements
- [ ] Anon REST probe (Step 5) returns `[]` for klanten, profiles, posts — or is explicitly reported as "pending migration apply"
- [ ] `.env.example` exists, contains only placeholders
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `SUPABASE_SERVICE_ROLE_KEY` is not in `.env.local` and you cannot obtain it
  (Step 1) — never invent or hardcode a key.
- The preview page renders blank/404 for a known-good post id after the
  switch — the service client may be misconfigured; do not weaken RLS to
  compensate.
- The Supabase CLI is unavailable for `db push` (Step 5) — hand the SQL to
  the operator.
- You find OTHER anon policies beyond the four named ones
  (`select policyname from pg_policies where 'anon' = any(roles)` if you have
  SQL access) — list them in your report; do not drop unnamed extras.

## Maintenance notes

- Any future public-facing page (e.g. a public klant-portal) must follow the
  same pattern: server-side fetch via `createAdminClient()`, never anon RLS
  policies with `using (true)`.
- Reviewer should scrutinize: that `lib/supabase/admin.ts` is imported ONLY
  from server components/actions (grep for imports), and that no
  `NEXT_PUBLIC_` prefix sneaked onto the service key.
- Deferred: rotating the anon key (the old one allowed full reads until the
  migration runs). Cheap to do in the Supabase dashboard; recommend to the
  operator.
- Deferred: post `media_url` images on the preview page come from the public
  `post-media` bucket; plan 002 documents that trade-off.
