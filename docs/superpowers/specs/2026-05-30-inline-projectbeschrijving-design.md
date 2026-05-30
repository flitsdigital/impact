# Inline projectbeschrijving bewerken

**Datum:** 2026-05-30
**Status:** Goedgekeurd

## Doel

Op de projectdetailpagina kun je de beschrijving van een bestaand project
inline bewerken, in plaats van alleen-lezen. Spiegelt het bestaande
`editingDate`-patroon in `ProjectDetailModule.tsx`.

## Scope

Alleen `components/projecten/ProjectDetailModule.tsx`. Database, types en
server-actions (`createProject` / `updateProject`) ondersteunen `beschrijving`
al volledig — geen wijzigingen daar.

## Gedrag

1. **State:** `editingBeschrijving` (boolean) + `beschrijvingVal` (string,
   init op `project.beschrijving ?? ''`).
2. **Weergave-modus:** klikbare knop die `project.beschrijving` toont, of de
   placeholder 'Voeg een korte beschrijving toe...' in `text-fg-3`. Klikken →
   bewerkmodus.
3. **Bewerk-modus:** auto-gefocuste `<textarea>` met de huidige tekst, gestyled
   met Tailwind-classes consistent met `NieuwProjectDrawer` en `text-[13px]`.
4. **Opslaan bij `onBlur`:**
   - optimistisch `setProject({ ...p, beschrijving })`,
   - `editingBeschrijving` uit,
   - `startTransition(() => updateProject(project.id, { beschrijving: beschrijvingVal.trim() || null }))`.
5. **Annuleren met `Escape`:** reset `beschrijvingVal` naar `project.beschrijving`,
   sluit zonder opslaan. `Enter` = nieuwe regel (geen submit).

## Styling

Tailwind-classes, geen inline styles (projectvoorkeur).
