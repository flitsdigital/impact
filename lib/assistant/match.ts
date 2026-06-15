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

// Alleen letters/cijfers — zo matcht "private fun" (dictatie) ook "PrivateFun".
function tight(s: string): string {
  return norm(s).replace(/[^a-z0-9]/g, '')
}

// Score 0..1 hoe goed `query` bij `target` past.
export function scoreMatch(query: string, target: string): number {
  const q = norm(query)
  const t = norm(target)
  if (!q || !t) return 0
  if (q === t) return 1

  // Vergelijk spatie-/leesteken-ongevoelig ("private fun" ~ "PrivateFun").
  const tq = tight(query)
  const tt = tight(target)
  if (tq && tt) {
    if (tq === tt) return 0.97
    if (tt.startsWith(tq)) return 0.9
    if (tt.includes(tq)) return 0.8
    if (tq.includes(tt)) return 0.75
  }

  // Token-overlap als laatste redmiddel ("jan hout" ~ "hout bv").
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  let hit = 0
  for (const w of words) if (tt.includes(tight(w))) hit++
  return (hit / words.length) * 0.6
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
