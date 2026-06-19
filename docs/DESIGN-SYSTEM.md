# Design System — Flits CRM

> **Levende styleguide:** [`/design-system`](../app/(app)/design-system/page.tsx) (in de app, alleen via URL bereikbaar — achter login).
>
> ⚠ **Onderhoudsregel:** elk nieuw gedeeld component (alles in `components/ui/` en gedeelde domein-componenten) krijgt **direct bij aanmaak**:
> 1. een `DemoBlock` op de `/design-system`-pagina (juiste sectie in `components/design-system/`)
> 2. een vermelding in dit document (inventaris hieronder)
>
> Deze regel staat ook in `AGENTS.md` en geldt voor elke sessie/PR.

---

## 1. Tokens

Bron: [`app/globals.css`](../app/globals.css) (`@theme` + `:root`). **Gebruik altijd Tailwind-classes die aan tokens gekoppeld zijn — nooit losse hexwaarden of inline styles in componenten.** Dynamische kleuren uit data (projectkleur, prioriteitskleur) zijn de enige toegestane inline `style`-waarden.

### Kleuren

| Token | Hex | Tailwind | Gebruik |
|---|---|---|---|
| `--bg-0` | `#070707` | `bg-bg-0` | App-achtergrond, sidebar, segmented-control-container |
| `--bg-1` | `#0F0F10` | `bg-bg-1` | Panelen, drawers, dropdown-menu's |
| `--bg-2` | `#161616` | `bg-bg-2` | Kaarten (TaakKaart/ProjectKaart), velden in modals |
| `--bg-3` | `#19191A` | `bg-bg-3` | Pills (SearchInput), hover-states |
| `--bg-4` | `#1F1F1F` | `bg-bg-4` | Progressbar-track |
| `--fg-1` | `#F1E7E7` | `text-fg-1` | Primaire tekst, titels |
| `--fg-2` | `#919193` | `text-fg-2` | Secundaire tekst |
| `--fg-3` | `#656565` | `text-fg-3` | Tertiaire tekst, placeholders, sectielabels |
| `--fg-disabled` | `#3A3A3B` | `text-fg-disabled` | Disabled, lege-staat-iconen |
| `--border-subtle` | `#1D1E1F` | `border-border-subtle` | Vrijwel alle randen |
| `--border-strong` | `#626465` | `border-border-strong` | Nadruk-randen |
| `--brand-yellow` | `#FFF301` | — | Brand-accent |
| `--orange-500` | `#FFB223` | `text-orange-500` | Status: bezig / waarschuwing / verlopen deadline |
| `--blue-500` | `#0072F5` | `text-blue-500` | Status: feedback |
| `--purple-500` | `#8E4EC5` | `text-purple-500` | Status: akkoord |
| `--green-500` | `#46A557` | `text-green-500` | Status: klaar / voldaan |

Semantische aliassen: `--status-todo` (grijs), `--status-progress`/`--status-warning` (oranje), `--status-feedback` (blauw), `--status-approved` (paars), `--status-shipped` (groen).

**Let op:** er bestaan twee token-vocabulaires die **aliassen** van elkaar zijn (zie audit ronde 1): shadcn-stijl (`text-foreground`, `text-muted-foreground`, `border-input`, `bg-secondary`) en Figma-stijl (`text-fg-1`, `text-fg-2`, `border-border-subtle`, `bg-bg-3`). Beide zijn geldig; volg de stijl van het bestand waarin je werkt.

### Typografie

- `--font-sans`: **Modern Gothic** — alle UI-tekst
- `--font-numeric`: **Inter** — cijfers/tabellen; combineer met `tabular-nums`
- Schaal: `--fs-10` t/m `--fs-14` + `--fs-24` (detailpagina-titels gebruiken 28px). In de praktijk: `text-[10px]`…`text-[14px]`, metadata = 12px, body = 13px.
- Tracking: `--tracking-tight` (-0.01em); kaarten gebruiken `tracking-[-0.12px]`

### Radius & spacing

- Radius: `--r-xs` 2px · `--r-sm` 4px · `--r-md` 8px · `--r-lg` 10px · `--r-pill` 100px · `--r-full` 999px. Pills/zoekvelden/switchers = `rounded-full`; kaarten = `rounded`/`rounded-lg`; panelen = `rounded-xl`.
- Spacing: 4px-basis, `--space-1` (2px) t/m `--space-9` (32px).
- Layout: `--topbar-h` 40px, `--sidebar-w` 247px.
- Elevation: `--elev-popover`, `--elev-tooltip`.

### Motion / easing

- Curves (sterker dan de CSS-defaults): `ease-strong` `cubic-bezier(0.23,1,0.32,1)` voor enter/exit + hover · `ease-inout-strong` voor on-screen beweging/morph · `ease-drawer` voor drawers. Gebruik de Tailwind-utility (`ease-strong`), niet handgeschreven curves.
- Duur: UI < 300ms. Knop-/press-feedback 100–160ms, popovers/tooltips 125–200ms, dropdowns/selects 150–250ms, modals/drawers 200–500ms. Keyboard-acties (command palette, shortcuts) niet animeren.
- Animeer alleen `transform`/`opacity`/kleur; nooit `transition: all`/`transition-all` — benoem de properties.
- Popovers schalen vanaf hun trigger (`origin-(--transform-origin)` / `origin-(--radix-…-transform-origin)`); modals blijven gecentreerd. Geen `scale(0)` — start op `scale(.95)` + opacity.
- `prefers-reduced-motion` wordt globaal afgevangen in `globals.css` (beweging vrijwel instant).

### Datum & valuta (lib)

| Helper | Pad | Gebruik |
|---|---|---|
| `fmtDate(dateStr, opts?)` | `@/lib/dates` | Nederlandse datumweergave (`10 jun`); opts voor langere vormen |
| `parseDate(dateStr)` | `@/lib/dates` | Veilige parsing — date-only strings krijgen een middag-anker (geen tz-shift) |
| `isOverdue(dateStr)` | `@/lib/dates` | Deadline verlopen? (einde van de dag) |
| `formatEur(n)` | `@/lib/format` | `€ 1.250,-` (heel) / `€ 1.250,50` (centen), non-breaking space |

**Nooit** los `new Date(x + 'T12:00:00')` of `toLocaleDateString('nl-NL', …)` in componenten — altijd via deze helpers.

---

## 2. Componentinventaris

### Atomen — `components/ui/`

| Component | Props (kern) | Wanneer |
|---|---|---|
| `Button` | `variant` (default/secondary/outline/ghost/destructive/link), `size` (xs/sm/default/lg/icon-*) | Elke knop. Uitzondering: tabs met `border-b-2`-stijl en dropdown-triggers die `buttonVariants` als className krijgen |
| `Badge` | `variant` (default/secondary/outline/destructive/ghost/link) | Tellers en generieke chips |
| `StatusChip` | `iconName`, `label`, `textClass`, `iconSize`, `labelClass` | Icoon + label in statuskleur; voed met `KANBAN_COLUMNS` / `PROJECT_COLUMNS` / content-`STATUS_CONFIG` |
| `SegmentedControl<T>` | `options [{value,label,icon?}]`, `value`, `onChange` | Elke "kies één van N"-switcher (views, filters). **Geen eigen pill-rows bouwen** |
| `SearchInput` | `value`, `onChange`, `placeholder`, `ariaLabel?`, `autoFocus?`, `className?` | Elk zoekveld; standaard pill 220px |
| `Input` / `Textarea` / `Label` | native props | Formuliervelden. Borderless inline-editors (titel in drawers) blijven bewust raw |
| `Checkbox` | `checked`, `onCheckedChange` | base-ui checkbox met vinkje |
| `Select` (+Trigger/Content/Item/Group/Value) | base-ui | Dropdowns in formulieren/filters; portal-popup |
| `PillSelect` | `value`/`defaultValue`, `onChange?`, `variant?` (`pill`\|`input`), `icon?`, `name?`, children = `<option>`s | Native select, look `pill` (compact) of `input` (volle breedte); veilig in Drawers (OS-menu). Gebruik dit i.p.v. base-ui `Select` binnen een Drawer |
| `DatePicker` | `value` ("YYYY-MM-DD"), `onChange`, `variant` (field/pill), `name?`, `clearable?` | Datumkeuze; `name` voor FormData-submits |
| `Avatar` | `src?`, `name?`, `size?`, `style?` | Initialen-fallback |
| `AvatarStack` | `people [{key,src?,name?}]`, `size`, `max=3`, `overlap`, `ringClass`, `showOverflow` | Gestapelde avatars met +N. Kaarten: `size 14, overlap 1.4`; PostCard: `20/6`; detail-meta: `18/4, ring-bg-1` |
| `EmptyState` | `icon?`, `title`, `description?`, `action?` | Elke lege staat |
| `Card` (+Header/Title/Description/Content/Footer) | div-props | Detailpagina-panelen |
| `Table` (+Header/Body/Row/Head/Cell/Footer/Caption) | table-props | Datatabellen (zie KlantenTable) |
| `SvgIcon` | `name`, `size=16`, `className` | Iconen uit `/public/icons` via CSS-mask (erft tekstkleur). `ICON_NAMES` exporteert de volledige lijst; rode iconen = placeholders |
| `KanbanBoard<TItem>` | `columns`, `items`, `getItemId`, `getColKey`, `renderCard`, `onMove`, `onAddItem?` | Generiek bord; optimistische updates horen in de parent |
| `LevelSelect` | `value` (0–3), `onChange`, `showLabels?`, `disabled?` | Rechten-niveau kiezen (Geen/Bekijken/Bewerken/Beheren). Voeding via `lib/permissions` (`LEVELS`) |
| `LevelBadge` | `level` (0–3), `withIcon?` | Toegangsniveau als getinte pill (weergave) |
| `RolePill` | `role` (`RoleId`), `active?`, `onClick?` | Rol-chip met gekleurde dot; klikbaar of informatief. Kleur/naam uit `ROLE_META` (`lib/permissions`) |
| `Stepper` | `steps [{id,label,icon?}]`, `current`, `onJump?` | Voortgangsindicator voor wizards; eerdere stappen klikbaar |

### Overlays — `components/ui/`

| Component | Wanneer |
|---|---|
| `Dialog` (+Content/Header/Title/Description/Footer) | Modals voor formulieren en bevestigingen; `showCloseButton` op Content/Footer |
| `Drawer` (vaul) / `AppDrawer` (+Header/Meta/Body/Footer) | Zwevend zijpaneel voor detail/aanmaak-flows. Gebruik vrijwel altijd `AppDrawer` |
| `DropdownMenu` (+Trigger/Content/Item/Label/Separator) | Elk klik-menu (radix, met keyboard-nav). **Geen handgerolde absolute panelen** |
| `Popover` (+Trigger/Content/Header) | Vrije popups (basis onder DatePicker) |
| `SelectionBar` | Zwevende actiebalk onderaan bij bulk-selectie (`count`, `onClear`, `label?`, children = acties). Verschijnt pas bij `count > 0` (zie KlantenTable) |

⚠ base-ui/radix-popups **binnen een vaul-Drawer** hebben `pointer-events-auto` nodig — zit al in de Content-componenten gebakken (zie memory/audit).

### Domein-componenten (gedeeld)

| Component | Pad | Wanneer |
|---|---|---|
| `PageHeader` + `PageToolbar` | `components/layout/PageHeader` | Elke moduleshell: titel + acties + toolbar |
| `TypeBadge` / `StatusBadge` | `components/klanten/KlantBadges` | Klanttype- en klantstatus-chips |
| `KlantFormFields` | `components/klanten/KlantFormFields` | Gedeelde veldenset klant-formulier (`klant?` voor defaults, `idPrefix` tegen id-botsing) |
| `FactuurStatusBadge` | `components/facturatie/FactuurStatusBadge` | Factuurstatus-pill (config: `FACTUUR_STATUS_CONFIG`) |
| `TaakKaart` | `components/projecten/TaakKaart` | Taak-kanban-kaart (`showProject?` voor cross-project-views) |
| `ProjectKaart` | `components/projecten/ProjectKaart` | Project-kanban-kaart |
| `TakenLijst` | `components/taken/TakenLijst` | Takentabel (`showProject?`) |
| `LeadKaart` | `components/leads/LeadKaart` | Pipeline-kaart voor leads (bedrijf, contactpersoon, bron, waarde) |
| `LeadsLijst` | `components/leads/LeadsLijst` | Leadstabel (bedrijf, contactpersoon, status, bron, waarde, datum) |
| `LeadFormFields` | `components/leads/LeadFormFields` | Gedeelde veldenset lead-formulier (`lead?` voor defaults, `idPrefix`) |
| `NieuweLeadDrawer` | `components/leads/NieuweLeadDrawer` | Aanmaak-drawer voor leads |
| `KanbanBoard` (taak-adapter) | `components/projecten/KanbanBoard` | Dunne adapter: KANBAN_COLUMNS + TaakKaart op het generieke bord |
| `DocumentIcon` | `components/ui/DocumentIcon` | Bijlage-icoon: Google-producticoon/favicon voor links, file-icoon voor bestanden |
| `BijlageModal` | `components/ui/BijlageModal` | Generieke bijlagen-modal (link + PDF-upload); entiteit-acties via props (`onAddDocument`, `onUploadFile`, `onDeleteDocument`, `makeDocument`) — gebruikt door project- én lead-detail |
| `DateShortcutsPicker` | `components/todos/DateShortcutsPicker` | Datum-picker: snelkoppelingen + kalender in een popover (todo-module) |
| `PriorityFlags` | `components/todos/PriorityFlags` | Prioriteit zetten met inline flags; voed met `PRIORITY_CONFIG`/`PRIORITY_ICON` |
| `AssigneeDropdown` | `components/todos/AssigneeDropdown` | Teamleden toewijzen (multi-select) met avatars |
| `TodoRow` | `components/todos/TodoRow` | Persoonlijke-todo-rij (variant B) met inline pickers |
| `TakenDrawer` | `components/todos/TakenDrawer` | Globale "Mijn taken"-drawer (quick-add + lijst); open via `useTakenStore` / ⌘⇧T |
| `ContentPlannenDrawer` | `components/content/ContentPlannenDrawer` | "Content plannen"-drawer: kies klant + schilder/sleep foto/video/afwisselend op een 2-maands kalender (rechtsklik = gum) → `bulkSchedulePosts` maakt drafts. Feature-drawer, geen losse DemoBlock |

### Status-configs (bron van waarheid)

| Config | Pad | Voedt |
|---|---|---|
| `KANBAN_COLUMNS` (taakstatus) | `types/project.ts` | StatusChip, KanbanBoard-kolommen, TakenLijst |
| `PROJECT_COLUMNS` (projectstatus) | `types/project.ts` | StatusChip, project-kanban, status-dropdown |
| `PRIORITY_CONFIG` / `PRIORITY_ICON` | `types/project.ts` | Prioriteit-pills en -iconen |
| `STATUS_ORDER/LABEL/ICON/COLOR` (posts) | `types/post.ts` | Content-module |
| `FACTUUR_STATUS_CONFIG` / `_NEXT` | `types/factuur.ts` | FactuurStatusBadge, tijdlijn |
| `LEAD_COLUMNS` / `BRON_LABEL` / `CONTACT_TYPE_CONFIG` | `types/lead.ts` | Leads-kanban, StatusChip, contactmomenten |

---

## 3. Conventies

1. **Tailwind-classes, geen inline styles** — behalve voor dynamische datakleuren (projectkleur, prioriteitskleur) en maatwerk-afmetingen die uit props komen (Avatar-size).
2. **Eerst hergebruiken, dan bouwen** — check `/design-system` en deze inventaris vóór je markup schrijft. Een tweede implementatie van iets bestaands is een bug (zie `docs/COMPONENT-AUDIT.md` voor wat dat eerder opleverde).
3. **Wanneer wordt iets een atoom?** Zodra hetzelfde patroon op een tweede plek nodig is → extraheren naar `components/ui/` (app-breed) of de domeinmap (module-specifiek), en hier documenteren.
4. **Status-rendering altijd via configs** — nooit losse status→kleur-mappings in componenten; gebruik de configs uit `types/` met `StatusChip`.
5. **Datums/valuta altijd via `lib/dates` en `lib/format`.**
6. **Bestandsnamen**: PascalCase voor componenten (`SegmentedControl.tsx`); `'use client'` alleen waar state/interactie zit.
7. **a11y**: interactieve elementen krijgen een `aria-label` als er geen zichtbare tekst is; gebruik bestaande overlays (focus-trap/keyboard zit erin).

## 4. Nieuw component toevoegen — checklist

1. Bouw het component op tokens (zie §1) en bestaande atomen.
2. Voeg een `DemoBlock` toe op de juiste sectie-pagina in `components/design-system/`.
3. Voeg een rij toe aan de inventaris in dit document (§2).
4. Draai `npx tsc --noEmit` en eslint.
