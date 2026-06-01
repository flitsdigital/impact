# Iconen — custom SVG-systeem

De app gebruikt **één** icoon-systeem: het `SvgIcon`-component
([components/ui/SvgIcon.tsx](../components/ui/SvgIcon.tsx)). Alle `lucide-react`
imports zijn verwijderd. Iconen zijn losse SVG-bestanden in
[public/icons](../public/icons).

## Gebruik

```tsx
import { SvgIcon } from "@/components/ui/SvgIcon"

<SvgIcon name="plus" />                                  // default 16px
<SvgIcon name="x" size={20} className="text-fg-3" />    // grootte + kleur
```

- `name` (verplicht) — bestandsnaam zonder `.svg` uit `/public/icons`.
- `size` (optioneel, default `16`) — pixelgrootte.
- `className` (optioneel) — kleur via `text-*` (de SVG erft `currentColor`).

`SvgIcon` rendert een `<span>` met een **CSS-mask**, géén `<svg>`. Daardoor:
- De kleur komt altijd van `currentColor` → stuur met `text-*` classes.
- Tailwind `[&_svg]` / `h-4 w-4` selectors pakken hem **niet**; gebruik `size`.
- Een onbekende `name` toont bewust een **rode cirkel** als placeholder.

## 🔴 Placeholders worden rood gerenderd

Iconen die nog niet door een eigen ontwerp zijn vervangen, staan in de
`PLACEHOLDER`-set in `SvgIcon.tsx`. Ze tonen wél hun vorm (de UI blijft
bruikbaar) maar worden **geforceerd rood** (`#ef4444`), zodat in één oogopslag
zichtbaar is wat nog gemaakt moet worden. Hover toont de naam.

## Eigen icoon toevoegen / vervangen

1. Zet je SVG in `public/icons/<naam>.svg` (overschrijf de placeholder).
2. **Haal `<naam>` uit de `PLACEHOLDER`-set** in `SvgIcon.tsx` → het icoon
   krijgt dan weer zijn normale kleur (`currentColor` / `text-*`).
3. Bij een geheel nieuwe naam: voeg `<naam>` ook toe aan de `AVAILABLE`-set
   (bestaande namen staan er al in).

> De SVG-kleur maakt niet uit (mask gebruikt alleen de vorm). Een `viewBox`
> rond `0 0 16 16` of `0 0 24 24` schaalt automatisch mee (`mask-size: contain`).

## ⚠️ Placeholders — nog te vervangen door eigen iconen

Bij de migratie zijn 30 SVG's als **placeholder** aangemaakt (eenvoudige
outline-glyphs, viewBox 16, stroke 1.5). Vervang de bestandsinhoud door je
eigen ontwerp; de bestandsnaam hoeft niet te wijzigen.

```
archive          chevron-down      file-text     map            settings
arrow-left       chevron-up        folder-open   message-square smile
badge-check      chevrons-right    link          pencil         star
check-square     circle-pause      list          refresh        table
clock            corner-down-right log-out       save           trash
external-link    file-plus                       upload         user · x
```

## Volledige mapping: oude Lucide-naam → SvgIcon `name`

### Hergebruikt (icoon bestond al in /public/icons)

| Lucide | SvgIcon `name` |
|--------|----------------|
| `Zap` | `bolt` |
| `Search` | `magnifying-glass` |
| `Plus` | `plus` |
| `Check`, `CheckIcon` | `check` |
| `Calendar` | `calendar` |
| `ChevronRight` | `chevron-right` |
| `Users` | `users` |
| `UserPlus`, `UserRoundPlus` | `user-plus` |
| `LayoutGrid` | `layout-grid` |
| `KanbanSquare` | `chart-kanban` |
| `ListChecks` | `list-check` |
| `Columns3` | `layout-columns` |
| `Inbox` | `inbox` |
| `ArrowUpDown` | `arrows-sort` |

### Nieuw aangemaakt als placeholder

| Lucide | SvgIcon `name` |
|--------|----------------|
| `X`, `XIcon` | `x` |
| `ChevronDown`, `ChevronDownIcon` | `chevron-down` |
| `ChevronUp`, `ChevronUpIcon` | `chevron-up` |
| `Upload` | `upload` |
| `ArrowLeft` | `arrow-left` |
| `Star` | `star` |
| `Pencil` | `pencil` |
| `Trash2` | `trash` |
| `MessageSquare` | `message-square` |
| `Link2` | `link` |
| `FileText` | `file-text` |
| `FilePlus` | `file-plus` |
| `ExternalLink` | `external-link` |
| `LogOut` | `log-out` |
| `User` | `user` |
| `Clock` | `clock` |
| `Map` | `map` |
| `Settings` | `settings` |
| `Smile` | `smile` |
| `CheckSquare` | `check-square` |
| `List` | `list` |
| `Table2` | `table` |
| `RefreshCw` | `refresh` |
| `FolderOpen` | `folder-open` |
| `Archive` | `archive` |
| `CirclePause` | `circle-pause` |
| `BadgeCheck` | `badge-check` |

### Ook hersteld (verwezen via SvgIcon maar bestand ontbrak → rode placeholder)

`save` · `corner-down-right` · `chevrons-right`
