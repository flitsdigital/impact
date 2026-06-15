// Pure fuzzy-matching helpers voor het koppelen van spraak/tekst aan een entiteit
// (lead, klant, post, project). Bewust simpel — de CRM heeft weinig rijen, dus we
// halen een set op en rangschikken in JS. De assistent vraagt terug bij twijfel.

export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

// Score 0..1 hoe goed `query` bij `target` past.
export function scoreMatch(query: string, target: string): number {
  const q = norm(query)
  const t = norm(target)
  if (!q || !t) return 0
  if (q === t) return 1
  if (t.startsWith(q)) return 0.9
  if (t.includes(q)) return 0.7
  // Token-overlap als laatste redmiddel ("jan hout" ~ "hout bv").
  const qt = new Set(q.split(/\s+/).filter(Boolean))
  const tt = new Set(t.split(/\s+/).filter(Boolean))
  if (qt.size === 0) return 0
  let hit = 0
  for (const w of qt) if (tt.has(w)) hit++
  return (hit / qt.size) * 0.6
}

// Rangschik items op naam-match; geef de beste (score ≥ threshold) terug.
export function rankMatches<T>(
  query: string,
  items: T[],
  key: (item: T) => string,
  opts: { limit?: number; threshold?: number } = {},
): T[] {
  const { limit = 5, threshold = 0.3 } = opts
  return items
    .map((item) => ({ item, score: scoreMatch(query, key(item)) }))
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item)
}
