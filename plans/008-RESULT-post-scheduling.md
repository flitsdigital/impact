# Spike result 008 — Post-scheduling completion (2026-06-11)

## Decision

**Implement option A now. Defer option B until a notification channel exists. Reject option C unconditionally.**

- **A (overdue surfacing)** — add a "Te laat" badge computed on read inside `ContentModule.tsx`, and wire up the already-stubbed "Posts te doen" dashboard tile in `app/(app)/dashboard/page.tsx` to show a live overdue count. Zero infrastructure changes. One additional one-line fix: write `published_at: new Date().toISOString()` inside `updatePostStatus` in `app/(app)/content/actions.ts:163–166` whenever `newStatus === 'gepost'`, so the column finally gets populated.
- **B (daily reminder automation)** — deferred. There is no email/push/webhook sink in the codebase. Adding automation before the output channel exists produces a silent no-op and creates infrastructure debt with no user value.
- **C (auto-flip to 'gepost')** — rejected. The CRM's own type documentation (`types/post.ts:3`) and the workflow comments make clear that `'gepost'` means a human posted on the platform. Auto-writing it would produce an audit trail that contradicts reality.

---

## Rationale

### published_at is declared but never written

- `supabase/migrations/002_content.sql:13` — column declared as `published_at timestamptz` (nullable, no default).
- `types/post.ts:46` — surfaced in the `Post` interface as `published_at: string | null`.
- `grep -rn "published_at" app/ components/` — **zero results**. The column passes through the type system but is never written or read by any action or component. Confirmed: no writes anywhere in `app/(app)/content/actions.ts` (the only file that mutates `posts`).

### updatePostStatus never touches published_at

`app/(app)/content/actions.ts:163–166`:
```ts
const { error } = await supabase
  .from('posts')
  .update({ status: newStatus })
  .eq('id', id)
```
Only `status` is written. The audit log insert at lines 169–174 records `from_status`/`to_status` but does not capture the timestamp into `published_at`.

### 'gepost' is set entirely by manual user action

Two paths both call `updatePostStatus`:
1. `ContentModule.tsx:169` — the `<select>` element's `onChange` handler in `StatusSelect`.
2. `ContentModule.tsx:617` / `ContentModule.tsx:633` — drag-and-drop via `handleZoneDrop` and `handleKanbanMove`.

There is no timer, background job, or hook that calls `updatePostStatus`. Status `'gepost'` is reached only when a user explicitly drags the card or changes the dropdown.

### No API route directory, no cron/queue dependencies

- `ls app/api` — directory does not exist. There are no route handlers at all.
- `package.json` — grep for `cron`, `queue`, `bull`, `bree`, `pg_cron`, `agenda`, `node-cron` returns empty. No job infrastructure of any kind is installed.

### Middleware would intercept any future cron route handler

`middleware.ts:48–52` — the matcher is:
```
"/((?!_next/static|_next/image|favicon.ico|icons/|fonts/).*)"
```
It does **not** exclude `/api/*`. `middleware.ts:37` redirects any unauthenticated request to `/login`. A bare Vercel Cron `GET /api/cron/overdue` or similar would be redirected to `/login` on every invocation unless that path is explicitly added to `isPublicRoute` (line 35) or a `Authorization: Bearer <secret>` header check is added before the auth guard.

### Dashboard tile is a placeholder

`app/(app)/dashboard/page.tsx:24` has a static `{ label: "Posts te doen", value: "—" }` tile inside a hardcoded array. It queries no data. Option A's dashboard work is additive — replace the placeholder with a live Supabase count query.

### No notification infrastructure

Grep for `resend`, `sendgrid`, `nodemailer`, `smtp`, `webhook` across `app/` and `package.json` returns no hits (only `email` as a profile column in Supabase joins). There is no channel through which a background job could reach a user.

---

## Rejected options

### Option B — Daily reminder automation (deferred, not rejected permanently)

**What it would require:** a Supabase `pg_cron` job or a Vercel Cron route at `app/api/cron/overdue/route.ts`. The route would query `posts` where `scheduled_at < today AND status != 'gepost'` and then… send something. That "send something" has no implementation target. There is no email service, no in-app notification table, and no Slack/Teams webhook configured. Building the scheduler before the sink creates dead code.

**Additionally:** the middleware issue noted above means any cron route handler requires a whitelist change to `middleware.ts:35` or an explicit secret-header guard, adding non-trivial surface area. Hosting platform is also unknown — Vercel Cron requires Vercel deployment; `pg_cron` requires Supabase Pro or a self-hosted instance with the extension enabled.

**Verdict:** revisit when a notification channel (email via Resend, in-app notification table, or webhook) is implemented.

### Option C — Auto-flip status to 'gepost' + write published_at on schedule (rejected)

The status `'gepost'` is documented in `types/post.ts:3` as part of a manual workflow (`'te_doen' | 'bezig' | 'klaar_voor_feedback' | 'akkoord' | 'gepost'`). The post audit log (`post_logs`) records status transitions with `user_id` (`002_content.sql:23`). Auto-flipping would insert a `status_changed → gepost` log entry with `user_id: null` or a service role ID, making it appear that a human (or the system) posted to the social platform when they did not. This is a correctness violation for an agency CRM where the audit trail is a client-facing artefact.

---

## Build outline — Option A

### 1. Write `published_at` when a post enters 'gepost'

**File:** `app/(app)/content/actions.ts`, lines 163–166.

Change the `.update()` call inside `updatePostStatus` to conditionally include `published_at`:

```ts
const { error } = await supabase
  .from('posts')
  .update({
    status: newStatus,
    ...(newStatus === 'gepost' && { published_at: new Date().toISOString() }),
  })
  .eq('id', id)
```

No migration needed — the column already exists (`002_content.sql:13`). This is a one-line additive change.

### 2. "Te laat" badge in ContentModule

**File:** `components/content/ContentModule.tsx`

Add a derived boolean to `PostCard` (line ~194):
```ts
const isOverdue = !!post.scheduled_at
  && post.status !== 'gepost'
  && post.scheduled_at < toDateKey(new Date())
```

Render a small red `Badge` (the `Badge` component is already imported at line 11) inside the card when `isOverdue` is true — e.g. above or beside the date label. No prop threading required because `post.scheduled_at` and `post.status` are already available on the `Post` object.

The same `isOverdue` logic should also apply to the lijst view post rows (around line 334 where `StatusIcon` is rendered) for consistency.

### 3. Dashboard overdue tile

**File:** `app/(app)/dashboard/page.tsx`

Replace the static hardcoded array with a real Supabase query before the component returns:

```ts
const today = new Date().toISOString().slice(0, 10)
const { count: overdueCount } = await supabase
  .from('posts')
  .select('id', { count: 'exact', head: true })
  .lt('scheduled_at', today)
  .neq('status', 'gepost')
```

Swap the `"Posts te doen"` tile's `value: "—"` to `value: String(overdueCount ?? 0)` and update the label to `"Posts te laat"` to be accurate. Optionally link the tile to `/content` with a future filter param.

### Effort estimate

| Step | Files touched | Complexity |
|------|--------------|------------|
| published_at write | `actions.ts` | 1 line |
| PostCard badge | `ContentModule.tsx` | ~8 lines |
| Dashboard tile | `dashboard/page.tsx` | ~8 lines |

Total: ~3 files, ~17 lines of logic, no new dependencies, no migrations.

---

## Open questions for the operator

1. **Hosting platform** — Is this deployed on Vercel? Vercel Cron Jobs (option B) are only available on Vercel and require at minimum the Hobby plan. If the app is self-hosted or deployed elsewhere, `pg_cron` (Supabase Pro, or enabled on self-hosted Postgres) would be the alternative. This determines what option B would look like when it is eventually picked up.

2. **Notification channel appetite** — What should a "Te laat" reminder actually do? Options in order of complexity: (a) in-app badge only (covered by option A), (b) Supabase in-app notification table + real-time subscription, (c) email via Resend/Postmark, (d) Slack/Teams webhook. The answer unblocks option B.

3. **published_at semantics** — Should `published_at` record the moment the user manually set the status to `'gepost'` (i.e. "we marked it done at this timestamp"), or should it eventually hold the actual platform publish timestamp (e.g. fetched from a social API)? The one-line fix above implements the former. Clarifying this now avoids a schema change later.

4. **Overdue threshold** — Should a post scheduled for today be considered overdue (strict `<`) or only from tomorrow onwards (strict `<=`)? The proposed query uses `lt('scheduled_at', today)` which means today's posts are not yet overdue until tomorrow. Confirm this matches team expectations.
