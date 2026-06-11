import { SectionHeading } from './DemoBlock'

/**
 * Tokens komen uit app/globals.css. Wijzig je daar iets, werk dan ook deze
 * lijsten en docs/DESIGN-SYSTEM.md bij.
 */
const BG_COLORS = [
  { token: '--bg-0', hex: '#070707', usage: 'App-achtergrond, sidebar' },
  { token: '--bg-1', hex: '#0F0F10', usage: 'Panelen, drawers, dropdowns' },
  { token: '--bg-2', hex: '#161616', usage: 'Kaarten, zoekvelden in modals' },
  { token: '--bg-3', hex: '#19191A', usage: 'Pills, hover-states, zoek-pill' },
  { token: '--bg-4', hex: '#1F1F1F', usage: 'Progressbar-track' },
]

const FG_COLORS = [
  { token: '--fg-1', hex: '#F1E7E7', usage: 'Primaire tekst, titels' },
  { token: '--fg-2', hex: '#919193', usage: 'Secundaire tekst' },
  { token: '--fg-3', hex: '#656565', usage: 'Tertiaire tekst, placeholders, labels' },
  { token: '--fg-disabled', hex: '#3A3A3B', usage: 'Disabled tekst, lege-staat-iconen' },
]

const BORDER_COLORS = [
  { token: '--border-subtle', hex: '#1D1E1F', usage: 'Vrijwel alle randen en scheidingslijnen' },
  { token: '--border-strong', hex: '#626465', usage: 'Nadruk-randen' },
]

const ACCENT_COLORS = [
  { token: '--brand-yellow', hex: '#FFF301', usage: 'Brand-accent' },
  { token: '--orange-500', hex: '#FFB223', usage: 'Status: bezig / waarschuwing' },
  { token: '--blue-500', hex: '#0072F5', usage: 'Status: feedback' },
  { token: '--blue-600', hex: '#5B5BD6', usage: 'Secundair blauw' },
  { token: '--purple-500', hex: '#8E4EC5', usage: 'Status: akkoord' },
  { token: '--green-500', hex: '#46A557', usage: 'Status: klaar / voldaan' },
]

const FONT_SIZES = [
  { token: '--fs-10', px: 10, sample: 'Overflow-teller, micro-labels' },
  { token: '--fs-12', px: 12, sample: 'Metadata, toolbars, tabelcellen' },
  { token: '--fs-13', px: 13, sample: 'Body, navigatie, formuliervelden' },
  { token: '--fs-14', px: 14, sample: 'Paginatitels, demo-koppen' },
  { token: '--fs-24', px: 24, sample: 'Grote koppen (detail-pagina: 28px)' },
]

const RADII = [
  { token: '--r-xs', px: 2 },
  { token: '--r-sm', px: 4 },
  { token: '--r-md', px: 8 },
  { token: '--r-lg', px: 10 },
  { token: '--r-pill', px: 100 },
]

const SPACING = [2, 4, 6, 8, 10, 12, 16, 24, 32]

function Swatch({ token, hex, usage }: { token: string; hex: string; usage: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-1 p-3 min-w-[260px]">
      <span
        className="size-10 rounded-md border border-border-subtle shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex flex-col min-w-0">
        <code className="text-[12px] font-mono text-fg-1">{token}</code>
        <span className="text-[11px] font-mono text-fg-3">{hex}</span>
        <span className="text-[11px] text-fg-3 truncate">{usage}</span>
      </div>
    </div>
  )
}

export function TokensSection() {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeading
        id="tokens"
        title="Tokens"
        intro="Alle design-tokens staan in app/globals.css (@theme + :root). Gebruik altijd de Tailwind-classes die eraan gekoppeld zijn (bg-bg-2, text-fg-3, border-border-subtle, …) — nooit losse hexwaarden in componenten."
      />

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Achtergronden</h3>
        <div className="flex flex-wrap gap-3">
          {BG_COLORS.map((c) => <Swatch key={c.token} {...c} />)}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Tekst</h3>
        <div className="flex flex-wrap gap-3">
          {FG_COLORS.map((c) => <Swatch key={c.token} {...c} />)}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Randen</h3>
        <div className="flex flex-wrap gap-3">
          {BORDER_COLORS.map((c) => <Swatch key={c.token} {...c} />)}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Accenten & statuskleuren</h3>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((c) => <Swatch key={c.token} {...c} />)}
        </div>
        <p className="text-[12px] text-fg-3">
          Semantische aliassen: <code className="font-mono">--status-todo</code> (grijs),{' '}
          <code className="font-mono">--status-progress</code> (oranje),{' '}
          <code className="font-mono">--status-feedback</code> (blauw),{' '}
          <code className="font-mono">--status-approved</code> (paars),{' '}
          <code className="font-mono">--status-shipped</code> (groen).
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Typografie</h3>
        <p className="text-[12px] text-fg-3">
          <code className="font-mono">--font-sans</code>: Modern Gothic (UI) ·{' '}
          <code className="font-mono">--font-numeric</code>: Inter (cijfers/tabellen, gebruik{' '}
          <code className="font-mono">tabular-nums</code> voor uitlijning).
        </p>
        <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-1 p-4">
          {FONT_SIZES.map((f) => (
            <div key={f.token} className="flex items-baseline gap-4">
              <code className="text-[11px] font-mono text-fg-3 w-20 shrink-0">{f.token}</code>
              <span className="text-fg-1" style={{ fontSize: f.px }}>{f.sample}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Radius</h3>
        <div className="flex flex-wrap items-end gap-4">
          {RADII.map((r) => (
            <div key={r.token} className="flex flex-col items-center gap-1.5">
              <span
                className="size-14 bg-bg-3 border border-border-subtle"
                style={{ borderRadius: r.px }}
              />
              <code className="text-[11px] font-mono text-fg-3">{r.token} · {r.px}px</code>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-[14px] font-medium text-fg-1">Spacing (4px-basis)</h3>
        <div className="flex flex-wrap items-end gap-3">
          {SPACING.map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <span className="bg-blue-500/40 border border-blue-500/60" style={{ width: s, height: 24 }} />
              <code className="text-[11px] font-mono text-fg-3">--space-{i + 1} · {s}px</code>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
