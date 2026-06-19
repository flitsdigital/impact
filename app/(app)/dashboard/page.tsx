import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Panel, PanelHeader, PanelEmpty } from '@/components/dashboard/DashboardPanel'
import { TakenPanel } from '@/components/dashboard/TakenPanel'
import { getComputedInvoices } from '@/lib/facturatie'
import { formatEur } from '@/lib/format'
import { getMonday, toLocalDateStr, fmtDate } from '@/lib/dates'
import { STATUS_ORDER, STATUS_LABEL, STATUS_ICON } from '@/types/post'
import type { PostStatus } from '@/types/post'
import type { KlantBilling } from '@/types/factuur'

// Status → token-achtergrond + tekstkleur voor de content-balken/iconen.
const STATUS_BG: Record<PostStatus, string> = {
  te_doen:             'bg-fg-2',
  bezig:               'bg-orange-500',
  klaar_voor_feedback: 'bg-blue-500',
  akkoord:             'bg-purple-500',
  gepost:              'bg-green-500',
}
const STATUS_TEXT: Record<PostStatus, string> = {
  te_doen:             'text-fg-2',
  bezig:               'text-orange-500',
  klaar_voor_feedback: 'text-blue-500',
  akkoord:             'text-purple-500',
  gepost:              'text-green-500',
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'daar'

  // ── Data (parallel) ──────────────────────────────────────────────────────────
  const [klantenRes, postsRes, leadsRes] = await Promise.all([
    supabase.from('klanten').select(`
      id, naam, type, status,
      contract_start_date, contract_end_date,
      billing_cycle, custom_cycle_days, price_per_cycle,
      invoice_records, project_budget, project_deadline,
      klant_facturen ( id, klant_id, label, amount, percentage,
        due_date, status, invoice_number, sent_at, paid_at, created_at, updated_at )
    `).not('status', 'eq', 'gearchiveerd'),
    supabase.from('posts').select('id, status, scheduled_at'),
    supabase.from('leads').select('waarde, status'),
  ])

  // ── Datumvensters ────────────────────────────────────────────────────────────
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const weekStart = getMonday(now)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
  const until = new Date(now.getFullYear(), now.getMonth() + 2, 0) // eind volgende maand
  const actieFrom = new Date(today); actieFrom.setDate(actieFrom.getDate() - 60)
  const actieTo = new Date(today); actieTo.setDate(actieTo.getDate() + 14)

  // ── Facturen: maandomzet, deze week, actie vereist ───────────────────────────
  const klanten = (klantenRes.data ?? []).map((k: Record<string, unknown>) => ({
    ...k,
    invoice_records: k.invoice_records ?? [],
    klant_facturen: k.klant_facturen ?? [],
  })) as unknown as KlantBilling[]

  let maandomzet = 0
  let facturenDezeWeek = 0
  const actie: { klant: string; dateStr: string; date: Date }[] = []
  for (const k of klanten) {
    for (const inv of getComputedInvoices(k, until)) {
      if (inv.date >= monthStart && inv.date < monthEnd) maandomzet += inv.amount
      if (inv.date >= weekStart && inv.date < weekEnd) facturenDezeWeek++
      const teVersturen = !inv.invoiced && inv.factuurStatus !== 'sent' && inv.factuurStatus !== 'paid'
      if (teVersturen && inv.date >= actieFrom && inv.date <= actieTo) {
        actie.push({ klant: k.naam, dateStr: inv.dateStr, date: inv.date })
      }
    }
  }
  actie.sort((a, b) => a.date.getTime() - b.date.getTime())

  // ── Posts: nog te sturen + content deze week ─────────────────────────────────
  const posts = (postsRes.data ?? []) as { status: PostStatus; scheduled_at: string | null }[]
  const postsNogTeSturen = posts.filter((p) => p.status !== 'gepost').length
  const wsStr = toLocalDateStr(weekStart)
  const weStr = toLocalDateStr(weekEnd)
  const weekPosts = posts.filter((p) => p.scheduled_at && p.scheduled_at >= wsStr && p.scheduled_at < weStr)
  const contentCounts = STATUS_ORDER.map((status) => ({
    status,
    count: weekPosts.filter((p) => p.status === status).length,
  }))
  const contentTotal = weekPosts.length
  const maxContent = Math.max(1, ...contentCounts.map((c) => c.count))

  // ── Leads: pipeline-waarde (open statussen) ──────────────────────────────────
  const leads = (leadsRes.data ?? []) as { waarde: number | null; status: string }[]
  const openLead = new Set(['nieuw', 'contact', 'offerte'])
  const pipeline = leads
    .filter((l) => openLead.has(l.status))
    .reduce((sum, l) => sum + (l.waarde ?? 0), 0)

  const kpis = [
    { icon: 'coin-vertical',       label: 'Huidige maandomzet',     value: formatEur(maandomzet) },
    { icon: 'text-size',           label: 'Posts nog te sturen',    value: String(postsNogTeSturen) },
    { icon: 'file-invoice-dollar', label: 'Facturen deze week',     value: String(facturenDezeWeek) },
    { icon: 'user-plus',           label: 'Totale pipeline waarde', value: formatEur(pipeline) },
  ]

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={`Goedemorgen, ${firstName}`} />

      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        {/* KPI-rij */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1 rounded-[10px] bg-bg-0 p-4">
              <div className="flex items-center gap-1.5">
                <SvgIcon name={k.icon} size={16} className="text-fg-2 shrink-0" />
                <span className="text-[14px] font-medium text-fg-2 tracking-[-0.14px]">{k.label}</span>
              </div>
              <span className="text-2xl font-bold text-fg-1 tracking-[-0.24px] tabular-nums">{k.value}</span>
            </div>
          ))}
        </div>

        {/* Kolommen */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TakenPanel />
          <ActiePanel items={actie} />
          <ContentPanel counts={contentCounts} total={contentTotal} max={maxContent} />
        </div>
      </div>
    </div>
  )
}

// ─── Actie vereist ───────────────────────────────────────────────────────────

function ActiePanel({ items }: { items: { klant: string; dateStr: string }[] }) {
  return (
    <Panel>
      <PanelHeader icon="bolt" title="Actie vereist!" count={items.length} />
      <div className="flex flex-col">
        {items.length === 0 ? (
          <PanelEmpty icon="badge-check" text="Niets dat actie vereist" />
        ) : items.slice(0, 8).map((it, i) => (
          <div key={`${it.klant}-${it.dateStr}-${i}`} className="flex flex-col gap-1 px-4 py-3 border-b border-border-subtle last:border-0">
            <div className="flex items-center gap-1.5 text-[12px] text-fg-2">
              <span className="flex items-center gap-1">
                <SvgIcon name="triangle-exclamation" size={14} />
                Factuur versturen
              </span>
              <span className="size-[2px] rounded-full bg-fg-3" />
              <span>{cap(fmtDate(it.dateStr))}</span>
            </div>
            <span className="text-[14px] font-medium text-fg-1 tracking-[-0.14px]">{it.klant}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ─── Content deze week ───────────────────────────────────────────────────────

function ContentPanel({ counts, total, max }: {
  counts: { status: PostStatus; count: number }[]
  total: number
  max: number
}) {
  const active = counts.filter((c) => c.count > 0)
  return (
    <Panel>
      <PanelHeader icon="bolt" title="Content deze week" link={{ href: '/content', label: 'Alles bekijken' }} />
      <div className="flex flex-col gap-4 p-4">
        {total === 0 ? (
          <PanelEmpty icon="text-size" text="Geen content gepland deze week" />
        ) : (
          <>
            {/* Verhoudingsbalk */}
            <div className="flex items-center gap-2.5 h-11">
              {active.map((c) => (
                <div key={c.status} className={cn('h-full rounded-[4px]', STATUS_BG[c.status])} style={{ flexGrow: c.count }} />
              ))}
            </div>
            {/* Legenda */}
            <div className="flex items-center gap-2.5">
              {active.map((c) => (
                <div key={c.status} className="flex items-center gap-1.5 min-w-0" style={{ flexGrow: c.count }}>
                  <span className={cn('size-[5px] shrink-0 rounded-full', STATUS_BG[c.status])} />
                  <span className="text-[10px] font-medium text-fg-1 tabular-nums">{c.count}</span>
                </div>
              ))}
            </div>
            {/* Status-rijen */}
            <div className="flex flex-col gap-[7px]">
              {counts.map((c) => (
                <div key={c.status} className="relative flex items-center gap-1 rounded-full bg-bg-4 px-1.5 py-1 overflow-hidden">
                  <SvgIcon name={STATUS_ICON[c.status]} size={14} className={cn('relative z-10 shrink-0', STATUS_TEXT[c.status])} />
                  <span className="relative z-10 text-[12px] font-medium text-fg-1 tracking-[-0.12px]">{STATUS_LABEL[c.status]}</span>
                  {c.count > 0 && (
                    <span
                      className={cn('absolute right-0 top-1/2 h-5 -translate-y-1/2 rounded-full', STATUS_BG[c.status])}
                      style={{ width: `${Math.max(8, (c.count / max) * 62)}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
