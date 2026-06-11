# Plan 005: Dependency & lockfile hygiene (dual lockfile, unused deps, PostCSS advisory)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4887fcb..HEAD -- package.json pnpm-lock.yaml package-lock.json .gitignore components/ui/calendar.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / migration
- **Planned at**: commit `4887fcb`, 2026-06-11

## Why this matters

Five small problems, one cleanup pass: (1) both `package-lock.json` (stale,
last touched 2026-05-27) and `pnpm-lock.yaml` are committed — an accidental
`npm install` desyncs the tree; (2) `react-hook-form` + `@hookform/resolvers`
have **zero imports** anywhere in source; (3) `shadcn` is a CLI tool sitting
in runtime `dependencies`; (4) `lucide-react` survives only as 3 chevron
icons inside the shadcn-generated `components/ui/calendar.tsx`, while the
codebase migrated to its own `SvgIcon` system (commit `c9501fa`); (5)
`pnpm audit` reports one moderate advisory — PostCSS < 8.5.10
(GHSA-qx2v-qp2m-jg93) resolved transitively via `next`.

## Current state

- Package manager is **pnpm** (`pnpm-workspace.yaml` + `pnpm-lock.yaml`
  exist; memory and recent commits confirm pnpm usage). `git ls-files` shows
  BOTH `package-lock.json` and `pnpm-lock.yaml` tracked.
- `package.json` dependencies (relevant lines):

```json
"@hookform/resolvers": "^5.4.0",
"lucide-react": "^1.16.0",
"react-hook-form": "^7.76.1",
"shadcn": "^4.8.0",
```

- Verified import scan (2026-06-11):
  - `react-hook-form`, `@hookform/resolvers`: **0 imports** in `app/`,
    `components/`, `lib/`, `store/`.
  - `lucide-react`: exactly **1 import** —
    `components/ui/calendar.tsx:13`:
    `import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"`
  - `shadcn`: 0 imports (it's the component-generator CLI).
- `pnpm audit` output: 1 moderate — `postcss <8.5.10`, path `.>next>postcss`,
  patched `>=8.5.10`.
- `components/ui/calendar.tsx` is shadcn-generated (react-day-picker v10).
  The chevrons are used inside the `components.Chevron` slot — find it with
  `grep -n "Chevron" components/ui/calendar.tsx`. Project memory warns: after
  any future `shadcn add calendar`, this file gets regenerated and the lucide
  import comes back (plus an import-casing fix for Button) — see Maintenance.
- The repo has a custom icon system: `components/ui/SvgIcon.tsx` (CSS mask +
  `currentColor`, icons in `public/icons/*.svg`, documented in
  `docs/ICONEN.md`). It does NOT necessarily have chevron SVGs — check
  `ls public/icons | grep -i chevron`. The safer replacement for calendar.tsx
  is small inline SVGs (no new assets needed), see Step 4.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0              |
| Build     | `pnpm build`             | exit 0              |
| Audit     | `pnpm audit`             | "No known vulnerabilities found" |
| Tests     | `pnpm test` (only if plan 003 landed) | all pass |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `pnpm-lock.yaml` (regenerated)
- `package-lock.json` (deleted)
- `.gitignore`
- `components/ui/calendar.tsx` (only the chevron import + Chevron component)

**Out of scope** (do NOT touch):
- `sonner`, `vaul`, `@base-ui/react`, `@radix-ui/*`, `tw-animate-css`,
  `react-day-picker`, `date-fns` — all in use (or pulled by calendar/global
  CSS); do not "clean" further than this plan specifies.
- Upgrading `next`, `react`, or any major version bumps.
- `skills-lock.json`, `pnpm-workspace.yaml`.

## Git workflow

- Branch: `advisor/005-dependency-hygiene`
- Commit style: e.g. `chore(deps): npm-lockfile weg, ongebruikte deps verwijderd, postcss-override`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the npm lockfile and prevent its return

```bash
git rm package-lock.json
```

Append to `.gitignore` (it has no lockfile entries today):

```
# npm — this repo uses pnpm
package-lock.json
```

**Verify**: `git ls-files | grep package-lock` → no output

### Step 2: Drop unused dependencies, move shadcn to dev

Re-verify nothing changed since the audit (expect 0 matches):

```bash
grep -rn "react-hook-form\|@hookform" app components lib store --include="*.ts" --include="*.tsx"
```

Then:

```bash
pnpm remove react-hook-form @hookform/resolvers
pnpm remove shadcn && pnpm add -D shadcn
```

**Verify**: `npx tsc --noEmit` → exit 0; in `package.json`, `shadcn` is under
`devDependencies`, the two form packages are gone.

### Step 3: PostCSS override

In `package.json`, add (top-level key, alongside `dependencies`):

```json
"pnpm": {
  "overrides": {
    "postcss": ">=8.5.10"
  }
}
```

Then `pnpm install`.

**Verify**: `pnpm audit` → "No known vulnerabilities found";
`pnpm why postcss | head -5` → shows a version ≥ 8.5.10; `pnpm build` → exit 0
(PostCSS 8.5.x is a safe patch range for Tailwind 4 — if the build fails on
CSS processing, see STOP conditions).

### Step 4: Replace the lucide chevrons in calendar.tsx, remove lucide-react

In `components/ui/calendar.tsx`, find the `Chevron` slot component (grep
`Chevron`). It currently switches on `orientation` and renders
`ChevronLeftIcon` / `ChevronRightIcon` / `ChevronDownIcon`. Replace the
lucide import (line 13) with a small local component, keeping the same
rendered size/classNames the lucide icons received:

```tsx
function ChevronGlyph({ orientation, className }: { orientation?: "left" | "right" | "up" | "down"; className?: string }) {
  const rotate = { left: "rotate-90", right: "-rotate-90", up: "rotate-180", down: "" }[orientation ?? "down"]
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`${rotate} ${className ?? "size-4"}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
```

…and wire the existing `Chevron` slot to render `<ChevronGlyph orientation={orientation} className={...} />`
preserving whatever className logic is there now. Then:

```bash
pnpm remove lucide-react
```

**Verify**: `grep -rn "lucide" app components lib store --include="*.ts*"` →
no matches; `npx tsc --noEmit` → exit 0; `pnpm build` → exit 0.
Visual check if a dev server is available: open any page with the
`DatePicker` (e.g. the NieuweTaakDrawer) and confirm the calendar month
navigation arrows render and point left/right.

### Step 5: Final sweep

```bash
pnpm install && npx tsc --noEmit && pnpm build && pnpm audit
```

**Verify**: all exit 0; audit clean.

## Test plan

No new tests — this is dependency surgery; the gates are typecheck, build,
audit, and the calendar visual check in Step 4. If plan 003 landed, also run
`pnpm test` → pass.

## Done criteria

- [ ] `git ls-files` contains `pnpm-lock.yaml` but NOT `package-lock.json`
- [ ] `package.json` has no `react-hook-form`, `@hookform/resolvers`, or `lucide-react`; `shadcn` is in devDependencies
- [ ] `pnpm audit` → 0 vulnerabilities
- [ ] `grep -rn "lucide" app components lib store` → 0 matches
- [ ] `npx tsc --noEmit` and `pnpm build` exit 0
- [ ] Calendar chevrons still render (manual check or noted as unverified)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The Step 2 grep finds NEW imports of react-hook-form (someone started using
  it since 2026-06-11) — skip that removal, do the rest.
- `pnpm build` fails after the PostCSS override (Tailwind 4 / @tailwindcss/postcss
  incompatibility) — remove the override, report, leave the advisory open.
- The `Chevron` slot in calendar.tsx receives props beyond
  `orientation`/`className` that the replacement must honor — report the
  actual prop shape instead of guessing.
- Removing `lucide-react` breaks the typecheck somewhere OTHER than
  calendar.tsx — there's an import the scan missed; report it.

## Maintenance notes

- **Re-running `shadcn add calendar` will regenerate calendar.tsx and
  reintroduce the lucide import.** Project memory already documents post-add
  fixes (Button import-casing, rdp v10 `month_grid`); add "replace lucide
  chevrons with ChevronGlyph" to that ritual. Consider noting it in
  `docs/ICONEN.md`.
- The PostCSS override can be deleted once `next` ships a postcss ≥ 8.5.10
  transitively (`pnpm why postcss` after future Next upgrades).
- Reviewer: diff of `pnpm-lock.yaml` should show only removals + the postcss
  bump — any other version drift means `pnpm install` picked up unintended
  updates.
