# Component Audit — Flits CRM

# Ronde 2 — 2026-06-11: duplicaat-componenten & gemiste atomen

_58 componentbestanden gescand (structurele scan + handmatige verificatie van elke vondst). Ronde 1 (onderaan dit document) dekte input/textarea-primitieven en is geïmplementeerd; deze ronde kijkt naar component-niveau duplicatie — hetzelfde UI-element dat meerdere keren opnieuw is gebouwd._

## Samenvatting

- **6 duplicaat-clusters** (componenten die 2–5× opnieuw gebouwd zijn)
- **8 gemiste-hergebruik-patronen** (inline herimplementaties en ontbrekende ui-atomen)
- Het grootste probleem is niet één component maar een patroon: feature-modules (`ProjectenModule`, `TakenModule`, `ContentModule`, `KlantenTable`, `FacturatieTijdlijn`) bouwen elk hun eigen toolbar-elementen, badges, tabellen en kaart-onderdelen in plaats van gedeelde atomen te gebruiken. De fix is een handvol kleine componenten in `components/ui/` + 2 utils in `lib/`, daarna call-sites vervangen.

---

## 1. Duplicaat-componenten

### 1.1 View switcher / segmented control — 5× gebouwd, 2 visuele stijlen ⭐ hoogste prioriteit

Er bestaan **vijf** implementaties van hetzelfde pill-switcher concept, in **twee verschillende stijlen**:

| Bestand | Regels | Implementatie |
|---|---|---|
| `components/projecten/ProjectenModule.tsx` | 115–127 | rauwe `<button>`, géén `bg-bg-0` container |
| `components/taken/TakenModule.tsx` | 139–152 | `<Button variant="ghost" size="xs">` in `p-0.5 rounded-full bg-bg-0` |
| `components/content/ContentModule.tsx` | 698–711 | idem als Taken |
| `components/klanten/KlantenTable.tsx` | 154–171 én 174–191 (type-filter) | idem als Taken |
| `components/facturatie/FacturatieTijdlijn.tsx` | 484–494 (status-filter) | rauwe `<button>`, wéér andere classes |

Dit verklaart het zichtbare verschil tussen de Projecten-switcher (rauwe buttons, geen donkere container) en de Taken-switcher.

**Voorstel:** één component `components/ui/SegmentedControl.tsx`:

```tsx
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; icon?: string }[]
  value: T
  onChange: (value: T) => void
}
```

Rendert de `p-0.5 rounded-full bg-bg-0`-container met `Button variant="ghost" size="xs"` per optie (de Taken/Content-stijl als canoniek). Vervangt 5 call-sites, inclusief de type-filter in KlantenTable en de status-filter in FacturatieTijdlijn — zelfde patroon zonder iconen.

**Effort:** klein (±1 uur). **Risico:** laag; ProjectenModule krijgt de canonieke stijl en gaat er dus iets anders uitzien — dat is juist de bedoeling.

---

### 1.2 `TypeBadge` + `StatusBadge` — letterlijk gekopieerd

`components/klanten/KlantDetailModule.tsx:42` bevat zelfs het commentaar *"Chips (copied from KlantenTable.tsx)"*.

- `KlantenTable.tsx:24–62` ↔ `KlantDetailModule.tsx:44–82` — byte-voor-byte identiek.

**Voorstel:** verplaats beide naar `components/klanten/KlantBadges.tsx`, importeer op beide plekken. Puur verplaatsen, nul risico.

---

### 1.3 Klant-formulier — `KlantToevoegenModal` ↔ `EditDialog` (95% identiek)

De scanner mat 95,5% structurele overlap tussen `components/klanten/KlantToevoegenModal.tsx` en de interne `EditDialog` in `KlantDetailModule.tsx:120–277`. Beide bouwen hetzelfde Dialog + formulier (naam, type, contactpersoon, email/telefoon-grid, …). Verschillen: EditDialog heeft extra status/website/notities-velden en `defaultValue`s; de toevoegen-variant heeft een DatePicker voor "volgende factuur" en gebruikt `useActionState` i.p.v. `useTransition`.

**Voorstel:** extraheer `KlantFormFields` (de gedeelde veldenset, met `defaults?: Klant`) en laat beide dialogs die renderen. De submit-logica mag per dialog verschillen. Nieuw veld toevoegen = nu 2 plekken aanpassen, straks 1.

**Effort:** middel. **Risico:** laag.

---

### 1.4 Taken-lijsttabel — 2× vrijwel identiek

- `TakenModule.tsx:271–349` (`LijstView`)
- `ProjectDetailModule.tsx:654–723` (`TakenLijstView`)

Zelfde `<table>`, zelfde header-classes, zelfde rij-rendering (FLT-nummer, titel, status-chip, prioriteit-pill, deadline). Enige verschil: TakenModule heeft een extra Project-kolom.

**Voorstel:** één `components/taken/TakenLijst.tsx` met prop `showProject?: boolean` — exact zoals `TaakKaart` dat al netjes doet. Verwijdert ~75 regels duplicaat.

---

### 1.5 `FactuurStatusBadge` — 2 implementaties van hetzelfde concept

- `KlantDetailModule.tsx:99–109` — pill met `${cfg.color}22` achtergrond
- `FacturatieTijdlijn.tsx:890–895` — alleen gekleurde tekst

Beide lezen `FACTUUR_STATUS_CONFIG`. Twee verschillende renderingen van dezelfde status is vermoedelijk onbedoeld.

**Voorstel:** één `FactuurStatusBadge` in `components/facturatie/` met evt. een `variant`-prop; kies bewust één visuele stijl.

---

### 1.6 `TaakKaart` ↔ `ProjectKaart` — zelfde bouwstenen, apart gebouwd

`components/projecten/TaakKaart.tsx` en `ProjectKaart.tsx` zijn semantisch verschillende kaarten (terecht apart), maar herbouwen elk dezelfde onderdelen:

- identieke lokale helpers `fmtDate` + `isOverdue` (regels 9–18 in beide)
- identieke avatar-stack met `+N`-overflow (regels 57–74 in beide)
- identieke prioriteit-indicator (icoon + label)
- identieke progress-bar incl. dezelfde hardcoded kleurlogica (`#46A557` / `#0072F5` / `#FFB223`)
- identieke footer (count + deadline met overdue-kleur)

**Voorstel:** niet de kaarten mergen, maar de bouwstenen delen — zie 2.1 (AvatarStack), 2.3 (date-utils) en eventueel een kleine `ProgressBar` + `KaartFooter`. Daarna zijn beide kaarten ~40% korter.

---

## 2. Gemist hergebruik — inline herimplementaties

### 2.1 AvatarStack — 5× inline gebouwd

`assignees.slice(0, 3).map(...)` + `+{n − 3}`-overflow-bolletje staat in:

- `TaakKaart.tsx:57–74`
- `ProjectKaart.tsx:57–74`
- `ContentModule.tsx:221–237` (PostCard)
- `ProjectDetailModule.tsx:416–426`
- `NieuwePostDrawer.tsx`

Elk met nét andere maten (14/18/20px) en ring-kleuren — dat zijn props, geen redenen voor copy-paste.

**Voorstel:** `components/ui/AvatarStack.tsx`:

```tsx
<AvatarStack people={assignees.map(a => ({ src, name }))} size={14} max={3} ringClass="ring-bg-2" />
```

---

### 2.2 Search-pill — 6× inline gebouwd, 2 stijlen

| Bestand | Regels | Stijl |
|---|---|---|
| `ProjectenModule.tsx` | 92–102 | `bg-bg-3` pill + rauwe `<input>` |
| `TakenModule.tsx` | 113–123 | idem |
| `ProjectDetailModule.tsx` | 566–576 | idem |
| `AssigneesModal.tsx` | 108–115 | idem |
| `KlantenTable.tsx` | 137–145 | `<Input>` met absolute icon, `bg-secondary` |
| `FacturatieTijdlijn.tsx` | 456–467 | `<Input>` met absolute icon, `bg-bg-0` |

Twee visuele dialecten van hetzelfde ding. (Ronde 1 signaleerde dit ook al als follow-up.)

**Voorstel:** `components/ui/SearchInput.tsx` met props `value`, `onChange`, `placeholder`, `className`. Kies één stijl (de pill-variant lijkt de huisstijl).

---

### 2.3 Datum-formattering — 4 lokale `fmtDate`-helpers + 9 bestanden met losse `toLocaleDateString('nl-NL', …)`

Identieke `fmtDate` staat lokaal in `TaakKaart.tsx`, `ProjectKaart.tsx`, `ProjectDetailModule.tsx:48–53`; daarnaast inline date-calls in `TakenModule`, `ContentModule` (2×), `KlantDetailModule` (2×), `KlantenTable`, `NieuwProjectDrawer`, `FacturatieTijdlijn`. Ook `isOverdue` is 2× gedupliceerd, en de `+ 'T12:00:00'`-timezone-truc is op elke plek herhaald (in `ContentModule.tsx:196` staat per ongeluk `'T00:00:00'` — precies het soort drift dat duplicatie veroorzaakt).

**Voorstel:** `lib/dates.ts` met `fmtDate(dateStr)`, `fmtDateLong(dateStr)`, `isOverdue(dateStr)`. Eén plek voor de timezone-afhandeling.

---

### 2.4 Euro-formattering — 3 varianten

- `FacturatieTijdlijn.tsx:443` — `'€ ' + n.toLocaleString('nl-NL') + ',-'`
- `FacturatieTijdlijn.tsx:210` — zelfde patroon nóg een keer inline (gebruikt de eigen helper niet eens)
- `KlantDetailModule.tsx:468–471` — `Intl.NumberFormat('nl-NL', { style: 'currency' })`

Drie plekken, twee output-formaten (`€ 1.250,-` vs `€ 1.250,00`).

**Voorstel:** `formatEur()` in `lib/format.ts`; kies één weergave.

---

### 2.5 Status-chip (icoon + gekleurd label uit config) — ±6× inline

Het patroon `<SvgIcon name={cfg.iconName} className={cfg.textClass} /> <span className={cfg.textClass}>{cfg.label}</span>` op basis van `KANBAN_COLUMNS` / `PROJECT_COLUMNS` / `STATUS_CONFIG` staat in:

- `TakenModule.tsx:320–325` (lijst-rij)
- `ProjectDetailModule.tsx:375–376` (status-knop) en `696–698` (lijst-rij)
- `KlantDetailModule.tsx:86–95` (`ProjectStatusBadge`)
- `ContentModule.tsx:139–142` (`StatusIcon`, halve variant) en `508–509`

**Voorstel:** `components/ui/StatusChip.tsx` die `{ iconName, label, textClass }` accepteert — werkt voor taken, projecten én content-posts omdat alle configs al dezelfde vorm hebben.

---

### 2.6 Handgerolde dropdown terwijl `ui/DropdownMenu` bestaat

`ProjectDetailModule.tsx:368–405`: het status-wijzig-menu is met de hand gebouwd (fixed click-away overlay + absolute gepositioneerd paneel + eigen `statusOpen`-state), terwijl `components/ui/DropdownMenu.tsx` precies dit doet — inclusief keyboard-navigatie en a11y die de handgerolde versie mist. (Ronde 1 markeerde deze als "dropdown trigger, laten staan" — maar het hele *menu* eromheen is handwerk, niet alleen de trigger.)

**Voorstel:** vervang door `DropdownMenu` met `StatusChip`-items (2.5).

---

### 2.7 Rauwe `<button>` waar `ui/Button` past

Grootste gevallen:

- `NieuwProjectDrawer.tsx` — 8 rauwe buttons
- `ContentModule.tsx` — 3 (o.a. de "+"-hover-knop in MaandView, "Nieuwe post"-dashed-knop in WeekView)
- `ProjectenModule.tsx` — de view-switcher (zie 1.1)
- `FacturatieTijdlijn.tsx` — status-filter (zie 1.1)
- losse gevallen in `AssigneesModal`, `KlantDetailModule`, `app/(app)/layout.tsx`

Niet elke rauwe button is fout (tab-knoppen met `border-b-2`-stijl vallen buiten `Button` — zie ronde 1), maar de meeste zijn gewoon `variant="ghost"`-gevallen.

**Voorstel:** opportunistisch meenemen per bestand; geen aparte sprint waard, behalve de gevallen die al onder 1.1 vallen.

---

### 2.8 Empty states — 5× ad hoc

- `ProjectenModule.tsx:134–148` — icoon + titel + subtekst + CTA (de mooiste)
- `TakenModule.tsx:280–283` — alleen een regel tekst
- `ProjectDetailModule.tsx:604–609` — icoon + tekst
- `ContentModule.tsx:478–482` — alleen tekst
- `KlantenTable.tsx:248–253` — tabelrij met tekst

**Voorstel:** `components/ui/EmptyState.tsx` met `icon`, `title`, `description?`, `action?`. Maakt lege schermen consistent (nu krijgt Projecten een nette CTA en Taken een kale regel).

---

## 3. Overig (bewust géén merge-advies)

- **Twee `KanbanBoard`-bestanden** — `components/ui/KanbanBoard.tsx` (generiek) en `components/projecten/KanbanBoard.tsx` (dunne taak-adapter). Dit is juist een **goed** patroon, maar de identieke naam is verwarrend. Suggestie: hernoem de adapter naar `TaakKanban.tsx`.
- **`PageHeader`/`PageToolbar`** worden al overal netjes hergebruikt 👍 — alleen `ProjectDetailModule` bouwt z'n eigen breadcrumb-header (regels 218–305); prima, dat is echt een ander ding.

## Status — geïmplementeerd 2026-06-11 ✅

Alle punten 1–7 uit de aanbevolen volgorde zijn doorgevoerd (commit `58bd1db`, gemerged naar main):

- **Nieuw in `components/ui/`:** `SegmentedControl`, `SearchInput`, `StatusChip`, `AvatarStack`, `EmptyState`
- **Nieuw per domein:** `taken/TakenLijst` (met `showProject`-prop), `klanten/KlantBadges`, `klanten/KlantFormFields`, `facturatie/FactuurStatusBadge`
- **Nieuw in `lib/`:** `dates.ts` uitgebreid met `parseDate`/`fmtDate(opts)`/`isOverdue`; `format.ts` met `formatEur` — beide met vitest-tests
- In FacturatieTijdlijn bleek nog een **zevende** segmented control (26w/52w-horizon) — ook vervangen
- Status-dropdown in ProjectDetailModule vervangen door `ui/DropdownMenu` (a11y-winst)

Bewuste visuele unificaties (geen bugs):
- Projecten-viewswitcher heeft nu de canonieke pill-stijl (donkere `bg-bg-0`-container)
- Zoekvelden in KlantenTable/FacturatieTijdlijn hebben nu de pill-stijl van de overige modules
- Facturatie-tooltip toont de factuurstatus nu als pill-badge (was alleen gekleurde tekst)
- In de klant-bewerkdialog staat het Status-veld nu ná email/telefoon (gedeelde veldenset)
- `ContentModule` gebruikte `T00:00:00` i.p.v. `T12:00:00` voor datums — gefixt via `parseDate`

Bewust niet gedaan: avatar-picker in `NieuwePostDrawer` (interactief, ander ding), relative-date-helper in `KlantenTable` (geen duplicaat), losse rauwe buttons buiten de switchers (opportunistisch), hernoemen `projecten/KanbanBoard` → `TaakKanban` (suggestie, geen functionele winst).

Verificatie: `tsc --noEmit` clean, vitest 21/21, `next build` groen, ESLint zonder nieuwe meldingen (resterende warnings zijn pre-existing), React Doctor-vinding in nieuwe code gefixt (TYPE_CONFIG naar module-scope).

## Aanbevolen volgorde (ronde 2)

1. **`SegmentedControl`** (1.1) — kleinste effort, grootste zichtbare consistentiewinst, 5 call-sites.
2. **`lib/dates.ts` + `lib/format.ts`** (2.3, 2.4) — triviaal, raakt 10+ bestanden, fixt ook de `T00:00:00`-inconsistentie en de twee euro-formaten.
3. **`AvatarStack` + `SearchInput` + `StatusChip`** (2.1, 2.2, 2.5) — drie kleine ui-atomen, samen ±150 regels duplicaat weg.
4. **Klant-badges verplaatsen** (1.2) — 5 minuten, verwijdert de "copied from"-schande.
5. **`TakenLijst` samenvoegen** (1.4) en **klant-formulier delen** (1.3).
6. **DropdownMenu in ProjectDetailModule** (2.6) — ook een a11y-verbetering.
7. Rauwe buttons en empty states (2.7, 2.8) — opportunistisch meenemen.

---

# Ronde 1 — 2026-06-01: form-primitieven (geïmplementeerd ✅)

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
