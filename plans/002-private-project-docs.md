# Plan 002: Make the project-docs storage bucket private (signed URLs)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- "app/(app)/projecten" components/projecten/BijlageModal.tsx components/projecten/ProjectDetailModule.tsx supabase/migrations`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. This plan was written against the
> working tree at `4887fcb` which had uncommitted edits to
> `components/projecten/ProjectDetailModule.tsx` — re-check the cited line
> numbers there with grep rather than trusting them blindly.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (001 recommended first but not required)
- **Category**: security
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

The `project-docs` storage bucket is created with `public = true` and a
"publicly readable" SELECT policy (migration 009). Project attachments are
client deliverables — contracts, PDFs, briefings. Anyone who obtains a file
URL (forwarded email, browser history, log file) can download it forever,
unauthenticated, and the paths are semi-predictable
(`<projectId>/<timestamp>-<original-filename>`). After this plan the bucket is
private; the app stores the storage *path* and serves short-lived signed URLs
to authenticated users only.

The `post-media` bucket is deliberately **left public**: its images are
social-media content rendered on the public `/preview/[id]` share page. That
is an accepted, documented trade-off — do not change it here.

## Current state

- `supabase/migrations/009_project_documents.sql` — bucket + policies:

```sql
-- 009_project_documents.sql (storage section)
insert into storage.buckets (id, name, public)
  values ('project-docs', 'project-docs', true)
  on conflict (id) do nothing;

create policy "Project docs are publicly readable"
  on storage.objects for select
  using (bucket_id = 'project-docs');
-- insert/update/delete policies already require auth.role() = 'authenticated'
```

The `project_documents` table stores `type` (`'link' | 'file'`), `naam`, and
`url` (currently the full public URL for files).

- `app/(app)/projecten/actions.ts:316-338` — `uploadProjectFile` uploads and
  returns the **public URL**:

```ts
const path = `${projectId}/${Date.now()}-${file.name}`
const bytes = Buffer.from(await file.arrayBuffer())
const { error: uploadError } = await supabase.storage
  .from('project-docs')
  .upload(path, bytes, { contentType: file.type, upsert: false })
if (uploadError) return { error: uploadError.message }
const { data: { publicUrl } } = supabase.storage.from('project-docs').getPublicUrl(path)
return { url: publicUrl }
```

- `app/(app)/projecten/actions.ts:292-314` — `deleteProjectDocument` derives
  the storage path by splitting the public URL:

```ts
if (doc?.type === 'file') {
  const path = doc.url.split('/project-docs/')[1]
  if (path) {
    await supabase.storage.from('project-docs').remove([path])
  }
}
```

- `components/projecten/BijlageModal.tsx:90-98` — upload flow: calls
  `uploadProjectFile(projectId, formData)`, then
  `addProjectDocument(projectId, 'file', fileName, uploadResult.url!)`. Also
  renders `<a href={doc.url} target="_blank">` at lines ~263-266.

- `components/projecten/ProjectDetailModule.tsx:527-532` — renders
  `<a href={doc.url} target="_blank">` for each document.

- `app/(app)/projecten/[id]/page.tsx:74-82` — fetches documents server-side:

```ts
let documents: any[] = []
try {
  const { data } = await supabase
    .from('project_documents')
    .select('id, project_id, type, naam, url, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
  documents = data ?? []
} catch { /* table may not exist yet */ }
```

- Repo conventions: server actions in `app/(app)/<module>/actions.ts` with
  `'use server'`, `requireAuth` helper, `{ error?: string }` return shape.
  Dutch domain naming. Migrations: numbered lowercase SQL.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm build`             | exit 0              |
| Lint      | `npx eslint .`           | no NEW errors vs. baseline (36 pre-existing problems) |

## Scope

**In scope** (the only files you should modify/create):
- `supabase/migrations/011_private_project_docs.sql` (create)
- `app/(app)/projecten/actions.ts` — `uploadProjectFile`, `deleteProjectDocument` only
- `app/(app)/projecten/[id]/page.tsx` — document fetching block only
- `components/projecten/BijlageModal.tsx` — upload call-site only
- (Possibly) `types/project.ts` — only if a `ProjectDocument` type field doc is needed

**Out of scope** (do NOT touch, even though they look related):
- The `post-media` bucket and everything in `app/(app)/content/` — public by
  documented design (preview page needs it).
- `addProjectDocument` for `type === 'link'` — external links stay full URLs.
- All non-document parts of `ProjectDetailModule.tsx` (it is a 723-line file;
  touch only the `doc.url` rendering if data shape requires it).

## Git workflow

- Branch: `advisor/002-private-project-docs`
- Commit style: e.g. `fix(security): project-docs bucket privé + signed URLs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Migration — make the bucket private

Create `supabase/migrations/011_private_project_docs.sql`:

```sql
-- ─── Make project-docs bucket private ────────────────────────────────────────
-- Project attachments are client deliverables; public read exposed them to
-- anyone with the URL. The app now serves short-lived signed URLs instead.

update storage.buckets set public = false where id = 'project-docs';

drop policy if exists "Project docs are publicly readable" on storage.objects;

create policy "Authenticated users can read project docs"
  on storage.objects for select
  using (bucket_id = 'project-docs' and auth.role() = 'authenticated');
```

**Verify**: `grep -c "public = false" supabase/migrations/011_private_project_docs.sql` → `1`

### Step 2: Store the storage path instead of the public URL

In `app/(app)/projecten/actions.ts`, `uploadProjectFile` (lines 316–338):
- Delete the `getPublicUrl` call and return the path:

```ts
// replace the last two statements of uploadProjectFile with:
return { url: path }
```

(The function's return field stays named `url` so the call-site contract in
BijlageModal doesn't change; for `type === 'file'` rows it now contains the
storage path, e.g. `"<projectId>/1718000000-rapport.pdf"`.)

In `deleteProjectDocument` (lines 292–314), keep backward compatibility with
old rows that contain full public URLs:

```ts
if (doc?.type === 'file') {
  // New rows store the bare storage path; legacy rows store the full public URL.
  const path = doc.url.includes('/project-docs/')
    ? doc.url.split('/project-docs/')[1]
    : doc.url
  if (path) {
    await supabase.storage.from('project-docs').remove([path])
  }
}
```

**Verify**: `npx tsc --noEmit` → exit 0;
`grep -c "getPublicUrl" "app/(app)/projecten/actions.ts"` → `0`

### Step 3: Serve signed URLs from the project detail page

In `app/(app)/projecten/[id]/page.tsx`, after the documents fetch (the
`try { ... } catch { /* table may not exist yet */ }` block at lines 74–82),
map file documents to signed URLs before passing them to the module:

```ts
// Sign file URLs (bucket is private). Links pass through untouched.
documents = await Promise.all(
  documents.map(async (doc) => {
    if (doc.type !== 'file') return doc
    const path = doc.url.includes('/project-docs/')
      ? doc.url.split('/project-docs/')[1]   // legacy full-URL rows
      : doc.url                               // new path-only rows
    const { data } = await supabase.storage
      .from('project-docs')
      .createSignedUrl(path, 60 * 60)         // 1 hour
    return { ...doc, url: data?.signedUrl ?? doc.url }
  })
)
```

Place this inside the existing `try` block or directly after it (if after,
guard with `if (documents.length > 0)`). The signed URL is generated with the
caller's authenticated session; the new SELECT policy from Step 1 permits it.

**Verify**: `npx tsc --noEmit` → exit 0

### Step 4: Check the BijlageModal flow still works

`components/projecten/BijlageModal.tsx:90-98` calls `uploadProjectFile` and
feeds `uploadResult.url!` into `addProjectDocument` — with Step 2 that now
stores the path, which is what we want. However, the modal also renders the
just-uploaded doc list with `<a href={doc.url}>` from its `documents` prop.
That prop comes from the page (Step 3 signs it), so freshly-signed URLs work.
If the modal optimistically appends the new doc client-side with the raw path
as `url`, the link will 404 until the next server refresh — check how the
documents list state updates after upload (look for `router.refresh()` or a
local `setDocuments`). If it's a `router.refresh()`, nothing to do. If it
appends locally, leave it (the link self-heals on refresh) but note it in
your report.

**Verify**: `pnpm build` → exit 0

### Step 5: Apply migration and probe

Apply with `supabase db push` (or STOP and hand the SQL to the operator, as
in plan 001 Step 5). Then probe that public access is gone — take any
existing file's public URL shape:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/project-docs/<some-existing-path>"
```

**Verify**: HTTP `400` or `404` (NOT `200`). If you cannot identify an
existing object path, report the probe as pending.

## Test plan

No test runner yet (plan 003). Manual gates above. After plan 003: a unit
test for the legacy-URL-vs-path branch in `deleteProjectDocument` path
parsing would be the highest-value addition (pure string logic).

## Done criteria

- [ ] `npx tsc --noEmit` exits 0; `pnpm build` exits 0
- [ ] `grep -c "getPublicUrl" "app/(app)/projecten/actions.ts"` → 0
- [ ] `grep -c "createSignedUrl" "app/(app)/projecten/[id]/page.tsx"` → 1
- [ ] Migration 011 exists; public probe returns non-200 (or reported pending)
- [ ] Manual: logged-in user can open an existing attachment from the project
      detail page (legacy full-URL row) AND a newly uploaded one
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Existing legacy rows fail to open after the change (signed-URL path
  extraction wrong) — do not flip the bucket back to public to "fix" it.
- `BijlageModal.tsx` turns out to render documents from state that never
  passes through the server page (i.e. signed URLs can't reach it) — report
  the actual data flow instead of restructuring the component.
- You're tempted to also privatize `post-media` — that breaks the public
  preview page; explicitly out of scope.
- The Supabase CLI is unavailable for `db push`.

## Maintenance notes

- Signed URLs expire after 1 hour; if users report broken links on
  long-open tabs, the expiry can be raised or regenerated client-side via a
  small server action.
- Future feature "share attachment with client" should use
  `createSignedUrl` with a longer TTL — never a return to a public bucket.
- Reviewer: confirm `type === 'link'` documents are untouched and the legacy
  URL fallback in `deleteProjectDocument` survived.
- Deferred: filename sanitization in the upload path is handled in plan 004
  (don't duplicate it here).
