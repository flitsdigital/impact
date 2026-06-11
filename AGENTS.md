<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design system — verplicht bijhouden

`docs/DESIGN-SYSTEM.md` + de levende styleguide op `/design-system` (`components/design-system/`) zijn de bron van waarheid voor tokens en componenten.

- **Vóór je UI bouwt:** check de inventaris in `docs/DESIGN-SYSTEM.md` — hergebruik bestaande atomen (`components/ui/`) in plaats van markup opnieuw te bouwen. Een tweede implementatie van iets bestaands is een bug.
- **Maak je een nieuw gedeeld component?** Dan hoort bij dezelfde change: (1) een `DemoBlock` op de `/design-system`-pagina, en (2) een rij in de inventaris van `docs/DESIGN-SYSTEM.md`. Niet optioneel.
- Styling: altijd Tailwind-classes op design-tokens (`bg-bg-2`, `text-fg-3`, …); datums via `lib/dates`, valuta via `lib/format`.
