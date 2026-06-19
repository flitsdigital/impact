// Streaming-fallback voor alle (app)-routes: vult de content-card terwijl de
// server-data van de pagina laadt. Vervangt het witte scherm bij navigatie.
// ponytail: generieke lijst-skeleton i.p.v. per-route — dekt de zware routes (leads, content, todos).
export default function Loading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4" aria-busy="true" aria-label="Laden">
      {/* Titel + primaire actie */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-44 animate-pulse rounded-sm bg-bg-3" />
        <div className="h-8 w-28 animate-pulse rounded-sm bg-bg-3" />
      </div>

      {/* Zoek/toolbar */}
      <div className="h-9 w-full max-w-xs animate-pulse rounded-sm bg-bg-2" />

      {/* Rijen */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-11 w-full animate-pulse rounded-sm bg-bg-2" />
        ))}
      </div>
    </div>
  )
}
