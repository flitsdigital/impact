// Granulair rechten-model. Statische definities (features + niveaus) leven in code;
// de feitelijke rol-rechten en per-gebruiker uitzonderingen komen uit de DB
// (tabellen roles / role_permissions / user_permission_overrides — zie migratie 020).
// Geen server-imports hier, zodat zowel components/ui/ als app-code dit mag importeren.

// ── Features (= de pagina's/modules) ─────────────────────────────────────────
export type FeatureId =
  | 'dashboard' | 'klanten' | 'facturatie' | 'content' | 'leads'
  | 'projecten' | 'taken' | 'gebruikers' | 'instellingen'
export type FeatureGroup = 'Werk' | 'Klanten' | 'Systeem'

export const FEATURES: { id: FeatureId; label: string; icon: string; group: FeatureGroup; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid', group: 'Werk', desc: 'Overzicht & widgets' },
  { id: 'projecten', label: 'Projecten', icon: 'chart-kanban', group: 'Werk', desc: 'Projecten & planning' },
  { id: 'taken', label: 'Taken', icon: 'list-check', group: 'Werk', desc: "Taken & to-do's" },
  { id: 'content', label: 'Content', icon: 'file-text', group: 'Werk', desc: 'Content plannen & posts' },
  { id: 'klanten', label: 'Klanten', icon: 'users', group: 'Klanten', desc: 'Klantdossiers' },
  { id: 'leads', label: 'Leads', icon: 'user-plus', group: 'Klanten', desc: 'Sales-pijplijn' },
  { id: 'facturatie', label: 'Facturatie', icon: 'chart-gantt', group: 'Klanten', desc: 'Facturen & omzet' },
  { id: 'gebruikers', label: 'Gebruikers', icon: 'smile', group: 'Systeem', desc: 'Team & rechten' },
  { id: 'instellingen', label: 'Instellingen', icon: 'settings', group: 'Systeem', desc: 'Koppelingen & audit' },
]
export const FEATURE_IDS = FEATURES.map((f) => f.id)
export const featureById = (id: FeatureId) => FEATURES.find((f) => f.id === id)!
export const FEATURE_GROUPS: FeatureGroup[] = ['Werk', 'Klanten', 'Systeem']

// ── Niveaus (per feature) ────────────────────────────────────────────────────
export type Level = 0 | 1 | 2 | 3 // geen, bekijken, bewerken, beheren
export const LEVELS: { value: Level; label: string; short: string; icon: string; tint: string; bg: string; desc: string }[] = [
  { value: 0, label: 'Geen toegang', short: 'Geen', icon: 'x', tint: 'text-fg-3', bg: 'bg-bg-3', desc: 'Feature is verborgen' },
  { value: 1, label: 'Bekijken', short: 'Bekijken', icon: 'magnifying-glass', tint: 'text-blue-500', bg: 'bg-blue-500/15', desc: 'Alleen lezen' },
  { value: 2, label: 'Bewerken', short: 'Bewerken', icon: 'pencil', tint: 'text-purple-500', bg: 'bg-purple-500/15', desc: 'Bekijken + wijzigen' },
  { value: 3, label: 'Beheren', short: 'Beheren', icon: 'bolt', tint: 'text-green-500', bg: 'bg-green-500/15', desc: 'Volledig, incl. verwijderen' },
]
export const levelMeta = (l: Level) => LEVELS[l]

// ── Permissie-map: feature → niveau ──────────────────────────────────────────
export type PermMap = Record<FeatureId, Level>
export function makePerm(base: Level, overrides: Partial<PermMap> = {}): PermMap {
  const m = {} as PermMap
  for (const f of FEATURES) m[f.id] = base
  return { ...m, ...overrides }
}

// ── Rollen ───────────────────────────────────────────────────────────────────
export type RoleId = 'beheerder' | 'manager' | 'lid' | 'lezer'
export type Role = { id: RoleId; name: string; tint: string; bg: string; description: string }

/** Statische rol-presentatie (kleur/naam). Rechten zelf komen uit de DB. */
export const ROLE_META: Record<RoleId, Role> = {
  beheerder: { id: 'beheerder', name: 'Beheerder', tint: 'text-purple-500', bg: 'bg-purple-500/15', description: 'Volledige toegang tot alles, inclusief rechtenbeheer' },
  manager: { id: 'manager', name: 'Manager', tint: 'text-blue-500', bg: 'bg-blue-500/15', description: 'Stuurt het werk aan, geen systeeminstellingen' },
  lid: { id: 'lid', name: 'Lid', tint: 'text-green-500', bg: 'bg-green-500/15', description: 'Werkt mee aan klanten, content en projecten' },
  lezer: { id: 'lezer', name: 'Alleen lezen', tint: 'text-fg-2', bg: 'bg-bg-3', description: 'Bekijkt alles, wijzigt niets' },
}
export const ROLE_IDS = Object.keys(ROLE_META) as RoleId[]
export const roleMeta = (id: RoleId) => ROLE_META[id] ?? ROLE_META.lid

/** Seed-rechten per rol — bron voor de migratie-seed én fallback in de app. */
export const ROLE_SEED: Record<RoleId, PermMap> = {
  beheerder: makePerm(3),
  manager: makePerm(3, { dashboard: 1, facturatie: 2, gebruikers: 1, instellingen: 0 }),
  lid: makePerm(2, { dashboard: 1, facturatie: 1, leads: 1, gebruikers: 0, instellingen: 0 }),
  lezer: makePerm(1, { gebruikers: 0, instellingen: 0 }),
}

// ── Effectieve rechten (rol + uitzonderingen) ────────────────────────────────
export function effectivePerms(rolePerms: PermMap, overrides?: Partial<PermMap> | null): PermMap {
  return { ...rolePerms, ...(overrides ?? {}) }
}
export const isOverridden = (rolePerms: PermMap, overrides: Partial<PermMap> | null | undefined, f: FeatureId) =>
  overrides?.[f] !== undefined && overrides[f] !== rolePerms[f]

// ── Navigatie → feature mapping (voor sidebar-gating) ────────────────────────
// Alleen items met een feature worden gegate; items zonder mapping blijven altijd zichtbaar.
export const NAV_FEATURE: Record<string, FeatureId> = {
  '/dashboard': 'dashboard',
  '/klanten': 'klanten',
  '/timeline': 'facturatie',
  '/content': 'content',
  '/leads': 'leads',
  '/projecten': 'projecten',
  '/taken': 'taken',
  '/todos': 'taken',
  '/gebruikers': 'gebruikers',
  '/instellingen': 'instellingen',
}
