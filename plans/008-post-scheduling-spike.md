# Plan 008: Spike — finish the post-scheduling story (scheduled_at → what happens?)

> **Executor instructions**: This is a SPIKE/design plan, not a build plan.
> The deliverable is a short written recommendation (a markdown doc) plus at
> most a proof-of-concept migration — NOT a shipped feature. Follow the steps,
> honor STOP conditions, and update the status row in `plans/README.md` when
> done.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- "app/(app)/content" components/content types/post.ts supabase/migrations/002_content.sql`
> On mismatch with the "Current state" excerpts, treat as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M (spike: ~half a day)
- **Risk**: LOW (no production changes without operator sign-off)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

The content module lets users schedule posts: `scheduled_at` is settable in
`NieuwePostDrawer`, the calendar view groups by it, and `updatePostDate`
reschedules. But nothing ever *happens* when the date arrives: the
`published_at` column (migration 002) is **never written anywhere in the
codebase**, there is no cron/job infrastructure, and posts silently sail past
their date with no signal. The feature is half-built and it's not even
settled WHAT the right completion is — this CRM does not post to social
platforms, so "auto-publish" may be wrong and "surface overdue posts" may be
right. This spike decides, with evidence, instead of guessing in a build plan.

## Current state

- `supabase/migrations/002_content.sql` — relevant columns on `posts`:

```sql
status        text not null default 'te_doen'
                check (status in ('te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost')),
scheduled_at  date,
published_at  timestamptz,
```

- `types/post.ts:3` — workflow statuses:
  `'te_doen' | 'bezig' | 'klaar_voor_feedback' | 'akkoord' | 'gepost'`.
  Note `gepost` is a MANUAL workflow state ("we posted this on the platform"),
  set by drag/status change in ContentModule.
- `app/(app)/content/actions.ts` — `updatePostDate(id, scheduledAt)` exists;
  `published_at` appears nowhere in `app/` or `components/`
  (verify: `grep -rn "published_at" app components` → only type defs and the
  preview page's data passthrough, no writes).
- No job infrastructure: `package.json` has no cron/queue deps; no
  `app/api/` routes exist at all; no Supabase edge functions directory.
- Hosting context: Next.js app, Supabase backend. Deployment target is not
  documented in-repo (README is boilerplate) — **the operator must confirm
  whether production runs on Vercel** (determines whether Vercel Cron is
  available).
- The team is a small Dutch digital agency; posts are published manually on
  the social platforms themselves.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Grep evidence | `grep -rn "published_at" app components` | read-only |

## Scope

**In scope**:
- `plans/008-RESULT-post-scheduling.md` (create — the spike's deliverable)
- Optionally ONE proof-of-concept file (a draft migration `.sql` or a draft
  route handler), clearly marked DRAFT, not wired up.

**Out of scope** (do NOT do in this spike):
- Shipping any cron, edge function, or schema change to production.
- Touching ContentModule/NieuwePostDrawer UI.
- Social-platform API integrations (Instagram/Facebook posting) — that's a
  product decision far beyond this spike.

## Steps

### Step 1: Establish the semantic question

Document in the result file: `gepost` currently means "a human posted this on
the platform". Therefore auto-flipping status to `gepost` when
`scheduled_at` passes would make the CRM **lie** about work that didn't
happen. Frame the three candidate completions:

- **A. Overdue surfacing (no automation)** — computed on read: a post with
  `scheduled_at < today` and `status not in ('gepost')` renders an "Te laat"
  indicator in ContentModule; optionally a dashboard count. Zero
  infrastructure, no new failure modes, honest data.
- **B. Daily reminder automation** — a scheduled job (see Step 2) finds
  posts due today/overdue and... does what? With no notification channel in
  the app (no email infra, no in-app notifications), the job has no good
  output sink yet. Becomes valuable only after a notifications feature exists.
- **C. Auto-publish semantics change** — redefine `gepost` as
  "scheduled date passed" and write `published_at` automatically. Rejected
  unless the operator explicitly wants it (it changes what the kanban means).

### Step 2: Evaluate the mechanism options (for B/C, or future use)

Compare in the result doc, with this repo's constraints:

1. **Supabase `pg_cron`** — a migration like
   `select cron.schedule('mark-overdue-posts', '0 6 * * *', $$ update posts set ... $$)`.
   Pros: no new deployment surface, lives in migrations. Cons: pg_cron must
   be enabled on the project tier; logic lives in SQL.
2. **Vercel Cron + route handler** — `app/api/cron/posts/route.ts` guarded by
   `CRON_SECRET`, configured in `vercel.json`. Pros: TypeScript, testable.
   Cons: only if production is on Vercel (UNCONFIRMED — ask); middleware
   matcher currently sends unauthenticated `/api/*` to `/login` redirect
   (middleware.ts matcher does NOT exclude `/api`), so the route must be
   whitelisted in `middleware.ts` — note this explicitly.
3. **External scheduler (n8n)** — the team has n8n available (an n8n MCP is
   connected in their tooling); a scheduled n8n workflow hitting Supabase
   directly. Pros: no code in this repo. Cons: logic outside version control.

### Step 3: Recommendation

Unless the operator states otherwise, recommend **Option A now** (overdue
surfacing — a small, fully in-repo change: one derived boolean + a badge in
ContentModule + optionally a dashboard tile), and **defer B until a
notification channel exists**. Record C as rejected with the semantic
argument. Write the result doc with: decision, rationale, the concrete
follow-up build plan outline for A (files: `components/content/ContentModule.tsx`
badge + `app/(app)/dashboard/page.tsx` tile), and the open question for the
operator (hosting platform; appetite for notifications).

**Verify**: `plans/008-RESULT-post-scheduling.md` exists and contains a
decision section, a rejected-options section, and ≤1 page of build outline.

## Done criteria

- [ ] Result doc exists at `plans/008-RESULT-post-scheduling.md` with decision + rationale + follow-up outline
- [ ] No production code/schema changed (`git status` shows only plans/ files, plus at most one DRAFT-marked PoC)
- [ ] The middleware `/api` interaction (Step 2.2) is documented if Vercel Cron is recommended
- [ ] `plans/README.md` status row updated

## STOP conditions

- If you cannot determine whether `gepost` is manual-only from the code
  (check ContentModule's status-change handlers) — ask the operator instead
  of assuming.
- If you start writing UI code for option A — that's the follow-up build
  plan, not this spike.

## Maintenance notes

- Whichever option ships later: `published_at` should be written at the
  moment a post ENTERS `gepost` (manual or automated) — that's a one-line
  addition to `updatePostStatus` in `app/(app)/content/actions.ts:155-178`
  worth bundling into the follow-up.
- The unused `assignee_id` column on posts (legacy single-assignee, per
  `types/post.ts` comment) is unrelated — don't let scope creep pull it in.
