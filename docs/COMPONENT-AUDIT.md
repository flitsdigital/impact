# Component Audit — Flits CRM

_Scanned 51 component files in `components/` and `app/` on 2026-06-01. Thresholds: duplicates ≥ 0.85, inline ≥ 0.80._

## Summary

- **0 duplicate component clusters, 0 whole-component inline re-implementations.** The module decomposition is clean — there are no two components doing the same job that should be merged.
- **~7 files reinvent form primitives** (`<input>` / `<textarea>`) by hand even though `Input` and `Textarea` atoms exist in `components/ui/`. Several of these files even import `Button` from the design system but skip `Input`/`Textarea`.
- **Root cause:** the codebase runs **two parallel design-token vocabularies**. The `ui/` atoms use shadcn-style tokens (`border-input`, `text-foreground`, `text-muted-foreground`); the hand-rolled fields use Figma-style tokens (`bg-bg-2`, `border-border-subtle`, `text-fg-1`, `text-fg-3`). 16 files use the custom tokens vs 15 using the atom tokens — a near-even split. People hand-roll inputs because the atom doesn't match the Figma look.

The headline fix is small-to-medium effort: align the `Input`/`Textarea` atoms to the Figma tokens (or expose a variant), then replace the bordered hand-rolled fields with the atom. The "inline edit" fields (transparent, borderless title/description editors) are deliberate and should stay raw or get a dedicated `ghost` variant.

## Duplicate components

None found. ✅

## Missed reuse — inline re-implementations

No whole-component re-implementations found. ✅ (e.g. nobody rebuilt a `Card` or `Drawer` by hand.)

## Missed reuse — reinvented primitives

These are real and consistent. I've split them into **genuine reuse misses** (bordered fields that replicate the atom) and **legitimate inline editors** (transparent/borderless, deliberately not the atom).

### Genuine misses — bordered inputs that replicate the `Input` atom

| File | Lines | Notes |
|------|-------|-------|
| [BijlageModal.tsx](components/projecten/BijlageModal.tsx) | 184, 194, 218, 237 | 4 bordered text inputs (`border rounded px-3 py-2`) — textbook `Input` use. Does not import `Input`. |
| [ProjectDetailModule.tsx](components/projecten/ProjectDetailModule.tsx) | 446, 453, 565 | Form fields; imports `Select` but not `Input`. |
| [NieuwProjectDrawer.tsx](components/projecten/NieuwProjectDrawer.tsx) | 124, 238, 280 | Form fields (line 112 is a deliberate borderless title editor — leave it). |
| [NieuweTaakDrawer.tsx](components/projecten/NieuweTaakDrawer.tsx) | 97, 164 | Form fields. |
| [NieuwePostDrawer.tsx](components/content/NieuwePostDrawer.tsx) | 395 | Bordered text input. (Line 436 is a hidden `type="file"` — leave it, atoms don't cover file pickers.) |

**Suggestion:** `import { Input } from "@/components/ui/Input"` and replace
`<input className="bg-bg-2 border border-border-subtle rounded px-3 py-2 text-[13px] …" />`
with `<Input className="…size overrides only…" />`. Blocked on the token alignment below — until the atom matches the Figma look, swapping it changes the visuals.

### Genuine misses — bordered textareas that replicate the `Textarea` atom

| File | Lines | Notes |
|------|-------|-------|
| [TaakDetailDrawer.tsx](components/projecten/TaakDetailDrawer.tsx) | 180, 228 | Bordered description textareas (`border rounded-lg px-3 py-2 resize-none`) ≈ the `Textarea` atom exactly. |
| [NieuwProjectDrawer.tsx](components/projecten/NieuwProjectDrawer.tsx) | 298 | Bordered textarea. |
| [NieuweTaakDrawer.tsx](components/projecten/NieuweTaakDrawer.tsx) | 177 | Bordered textarea. |

**Suggestion:** replace with `<Textarea …/>`. Note: `NieuwePostDrawer` already imports `Textarea` — use it as the reference pattern.

### Legitimate — leave as raw (deliberate inline editors)

Not bugs; documenting so they aren't "fixed" by mistake:

- [NieuwProjectDrawer.tsx:112](components/projecten/NieuwProjectDrawer.tsx#L112) — borderless `text-[22px]` project-title editor.
- [TaakDetailDrawer.tsx:96](components/projecten/TaakDetailDrawer.tsx#L96) — borderless task-title editor.
- [ProjectDetailModule.tsx:326](components/projecten/ProjectDetailModule.tsx#L326) — inline description textarea (transparent).

If you want these unified too, add a `variant="ghost"` to `Input`/`Textarea` rather than forcing the default bordered atom.

### Low priority — distinct by design

- [FacturatieTijdlijn.tsx:459](components/facturatie/FacturatieTijdlijn.tsx#L459) — pill-shaped search input (`rounded-full h-[26px]` + icon). A distinct search style; only fold into `Input` if you want one canonical search field across the app.

### Raw `<button>` — mostly legitimate (low priority)

The scanner flagged many raw `<button>`s, but on inspection most are **not** reuse misses: they're tabs (`border-b-2` style, [BijlageModal.tsx:150](components/projecten/BijlageModal.tsx#L150)), dropdown triggers ([ProjectDetailModule.tsx:368](components/projecten/ProjectDetailModule.tsx#L368)), and hover-reveal icon affordances ([ContentModule.tsx:310](components/content/ContentModule.tsx#L310)) that the `Button` variants don't cleanly cover. Every one of these files already imports `Button` and uses it for real actions. **Recommendation:** don't chase these. If anything, consider a `Tabs` molecule later if the tab pattern repeats (it appears in `BijlageModal`, `ProjectDetailModule`, `NieuwePostDrawer`).

## The root cause worth fixing first: two token systems

This is the most valuable finding. Two vocabularies coexist:

- **Atom tokens** (`components/ui/*`): `border-input`, `bg-transparent`, `text-foreground`, `text-muted-foreground`, `focus-visible:ring-ring`.
- **Figma tokens** (module components): `bg-bg-0/2/3`, `border-border-subtle/strong`, `text-fg-1/3/disabled`.

As long as both exist, every developer building a Figma-matched screen will hand-roll rather than reach for an atom that looks wrong. Decide on **one** source of truth (almost certainly the Figma tokens, since that's what the designs use), retune the `Input`/`Textarea`/`Button` atoms to those tokens, then the reuse swaps above become safe and obvious.

## Status — implemented 2026-06-01

All genuine reuse misses were swapped to the `Input` / `Textarea` atoms. The token
investigation showed the two vocabularies are **aliases** (`--input` = `--border-subtle`,
`--foreground` = `--fg-1`, `--muted-foreground` = `--fg-2`), so no global atom retune was
needed — fields route through the atom while keeping their filled-look overrides via
`className` (the pattern already used in `login/page.tsx`).

Converted:
- `BijlageModal` — 3 text inputs → `Input`
- `ProjectDetailModule` — 2 date inputs → `Input`
- `TaakDetailDrawer` — date input → `Input`; beschrijving + comment → `Textarea`
- `NieuweTaakDrawer` — titel + date → `Input`; beschrijving → `Textarea`
- `NieuwProjectDrawer` — popover deadline + budget → `Input`
- `NieuwePostDrawer` — date pill → `Input`
- `FacturatieTijdlijn` — search pill → `Input`

Left raw on purpose (documented above): borderless inline editors (project/taak titles,
samenvatting, inline beschrijving), search inputs nested in styled pill wrappers, and
hidden `type="file"` inputs. Raw `<button>`s left as-is (tabs / dropdown triggers / hover
icons the `Button` variants don't cover).

Verified: `tsc --noEmit` clean; all changed routes compile without errors. (In-browser
modal screenshots not captured — gated behind Supabase auth.)

Possible follow-up: the four "icon + transparent input in a pill" search bars
(`ProjectenModule`, `TakenModule`, `AssigneesModal`, `ProjectDetailModule`) are a
repeated pattern — a small `SearchInput` molecule would DRY them up.

## Suggested order of work

1. **Unify tokens** — pick the Figma token set as canonical; retune `Input`, `Textarea`, `Button` atoms to it. (Unblocks everything else, prevents the next round of hand-rolling.)
2. **Swap bordered textareas → `<Textarea>`** — smallest, lowest-risk batch (4 spots), and `NieuwePostDrawer` already shows the pattern.
3. **Swap bordered inputs → `<Input>`** — `BijlageModal` first (4 in one file), then the drawers.
4. *(Optional)* Add `variant="ghost"` to `Input`/`Textarea` and adopt it for the inline title/description editors.
5. *(Optional, later)* Extract a `Tabs` molecule if the tab pattern keeps recurring.
