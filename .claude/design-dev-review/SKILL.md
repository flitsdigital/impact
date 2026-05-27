---
name: design-dev-review
description: >
  Vergelijk een Figma-ontwerp met de lopende dev-implementatie, check of bestaande
  gedeelde componenten (Button, PageHeader, etc.) correct worden gebruikt, en maak
  een gestructureerde lijst van visuele en code-consistentie verschillen met fixes.
  Gebruik deze skill wanneer de gebruiker vraagt om: design vs dev vergelijken,
  Figma naast de browser leggen, inconsistenties in components zoeken, "klopt dit
  met het ontwerp?", of een UI-review van een pagina of module.
---

# Design ↔ Dev Review

Je maakt een gestructureerde vergelijking tussen het Figma-ontwerp en de dev-implementatie.
Het doel is een concreet diff-rapport met prioriteit-geordende fixes — geen vage opmerkingen,
maar exacte Tailwind-klassen, component-namen en regelnummers.

## Stap 1 — Verzamel context

### 1a. Componentregels
Lees `.claude/monolithic-components/SKILL.md` voor de projectregels:
- Welke gedeelde UI-components bestaan er? (Button, PageHeader, PageToolbar, …)
- Wanneer mag je inline code schrijven vs. gedeelde component hergebruiken?
- Welke stylingregels gelden? (Tailwind only, geen inline styles, `cn()` voor conditioneel)

### 1b. Bestaande shared components inventariseren
Scan `components/ui/` en `components/layout/` en noteer welke components beschikbaar zijn
met hun varianten/props. Zo weet je later of iets "had een Button moeten zijn" of "had
PageHeader moeten gebruiken".

### 1c. Figma-ontwerp ophalen
Gebruik `mcp__Figma__get_design_context` met het Figma node-id dat de gebruiker geeft.
Haal daarna `mcp__Figma__get_screenshot` op voor een visuele snapshot.

Als de gebruiker geen Figma-link geeft, vraag dan naar: het Figma-bestand + node-id, of een
screenshot die zij zelf aanleveren.

### 1d. Dev-screenshot maken
Start de dev-server als die nog niet loopt (`preview_start`).
Navigeer naar de pagina en maak een screenshot met `preview_screenshot`.
Gebruik `preview_snapshot` voor de DOM-structuur als je specifieke klassen wil verifiëren.

## Stap 2 — Systematisch vergelijken

Loop deze categorieën langs en noteer per categorie de gevonden afwijkingen.

### A. Layout & spacing
- Padding, margin, gap — vergelijk de Figma spacings (frames/auto-layout gaps) met de Tailwind-klassen in de code
- Kolombreedte, flex/grid verdeling
- Border-radius van containers en cards

### B. Kleuren & tokens
- Achtergrondkleuren van containers, cards, sidebar
- Tekstkleuren (fg-1 / fg-2 / fg-3)
- Borderkleur (border-subtle, border-strong)
- Icoon- en accentkleuren

Design tokens voor dit project:
```
bg-0: #070707  bg-1: #0E0E0F  bg-2: #141416  bg-3: #18181A  bg-4: #1F1F1F
fg-1: #F1E7E7  fg-2: #B2ACAC  fg-3: #716C6C  fg-disabled: #4A4545
border-subtle: #1D1E1F  border: #222325  border-strong: #2C2D30
```

### C. Typografie
- Font-size (text-[12px] vs text-[13px] vs text-sm)
- Font-weight (font-medium vs font-semibold)
- Letter-spacing / tracking

### D. Component-gebruik & consistentie
Dit is het meest kritische onderdeel. Controleer:
- Worden knoppen gemaakt als `<Button variant="..." size="...">` of als ruwe `<button>` met custom classes?
- Gebruikt de pagina-header `<PageHeader>` en `<PageToolbar>`, of een eigen div?
- Zijn er inline styles (`style={{ color: '...' }}`) die Tailwind-klassen hadden moeten zijn?
- Worden `cn()` en `clsx`/`twMerge` gebruikt voor conditionele classes, of string-interpolatie?
- Worden iconen geladen via `<SvgIcon name="...">` consistent?

### E. Interacties & states
- Hover-states in dev vs Figma hover-varianten
- Focus-states en keyboard navigatie
- Loading/empty states

## Stap 3 — Rapport opstellen

Schrijf een gestructureerd rapport in dit formaat:

```
## Design ↔ Dev Review: [Pagina/Component naam]

### Kritiek (breken de visual identity)
- [ ] **[Categorie]** Omschrijving — fix: `exacte Tailwind klasse of component`
      Bestand: components/xxx/Yyy.tsx:42

### Middelgroot (zichtbaar maar niet blokkerend)
- [ ] ...

### Klein (polish)
- [ ] ...

### Component-consistentie issues
- [ ] Regel X gebruikt `<button className="...">` → vervang door `<Button variant="ghost" size="xs">`
      Bestand: ...

### Al correct ✓
- Layout van de kanban-kolommen klopt met Figma
- ...
```

## Stap 4 — Fixes doorvoeren

Als de gebruiker wil dat je de fixes ook direct maakt:
1. Prioriteer kritieke issues eerst
2. Fix één categorie tegelijk, maak een screenshot na elke fix-ronde
3. Hergebruik altijd bestaande shared components (Button, PageHeader, etc.) — schrijf geen nieuwe primitive
4. Gebruik alleen Tailwind-klassen; geen inline styles
5. Gebruik `cn()` voor conditionele klassen
6. Verifieer met `preview_screenshot` na de wijzigingen

## Tips voor snelle vergelijking

- Figma auto-layout gap = Tailwind `gap-X`
- Figma frame padding (horizontal/vertical) = Tailwind `px-X py-Y`
- Figma "Fill" kleur → zoek de dichtstbijzijnde design token (`bg-*`, `fg-*`, `border-*`)
- Figma component-instances → check of er een overeenkomstig shared component in `components/ui/` of `components/layout/` bestaat
- Als een Figma-node een `↗ component`-markering heeft, check of die al als React-component bestaat

## Wanneer NIET te refactoren

- Extraheer geen nieuw shared component als het maar op één plek voorkomt (zie monolithic-components-regels)
- Verander geen werkende logica om puur cosmetische redenen tenzij het een echte design-afwijking is
- Voeg geen nieuwe abstraction-lagen toe die niet door het ontwerp worden gevraagd
