// Vertaalt een assistent-tool-call naar mensentaal voor het logboek:
// wát er gebeurde en in welke module (waar je het terugvindt).

export interface ToolCall {
  name: string
  input: unknown
}

export interface DescribedCall {
  action: string
  module: string | null // null = alleen-lezen actie (opzoeken), geen module-link
  href: string | null
  detail: string | null
}

const MAP: Record<string, { action: string; module: string; href: string }> = {
  create_lead:        { action: "Lead aangemaakt",          module: "Leads",     href: "/leads" },
  log_contactmoment:  { action: "Contactmoment gelogd",     module: "Leads",     href: "/leads" },
  set_lead_status:    { action: "Lead-status gewijzigd",    module: "Leads",     href: "/leads" },
  update_lead:        { action: "Lead bijgewerkt",          module: "Leads",     href: "/leads" },
  create_klant:       { action: "Klant aangemaakt",         module: "Klanten",   href: "/klanten" },
  add_klant_note:     { action: "Klantnotitie toegevoegd",  module: "Klanten",   href: "/klanten" },
  update_klant:       { action: "Klant bijgewerkt",         module: "Klanten",   href: "/klanten" },
  create_post:        { action: "Post aangemaakt",          module: "Content",   href: "/content" },
  set_post_status:    { action: "Post-status gewijzigd",    module: "Content",   href: "/content" },
  reschedule_post:    { action: "Post verplaatst",          module: "Content",   href: "/content" },
  assign_post:        { action: "Post toegewezen",          module: "Content",   href: "/content" },
  create_project:     { action: "Project aangemaakt",       module: "Projecten", href: "/projecten" },
  set_project_status: { action: "Projectstatus gewijzigd",  module: "Projecten", href: "/projecten" },
  create_task:        { action: "Taak aangemaakt",          module: "Projecten", href: "/projecten" },
  update_task:        { action: "Taak bijgewerkt",          module: "Projecten", href: "/projecten" },
  set_task_status:    { action: "Taakstatus gewijzigd",     module: "Projecten", href: "/projecten" },
  add_task_comment:   { action: "Taakreactie toegevoegd",   module: "Projecten", href: "/projecten" },
  assign_task:        { action: "Taak toegewezen",          module: "Projecten", href: "/projecten" },
  add_todo:           { action: "Op je takenlijst gezet",   module: "Taken",     href: "/todos" },
  complete_todo:      { action: "Taak afgevinkt",           module: "Taken",     href: "/todos" },
  delete_todo:        { action: "Taak verwijderd",          module: "Taken",     href: "/todos" },
}

// Het meest sprekende veld uit de input (de "wat"-naam of -waarde).
const DETAIL_KEYS = ["bedrijfsnaam", "naam", "titel", "caption", "tekst", "inhoud", "notitie", "status"]

function pickDetail(input: unknown): string | null {
  if (!input || typeof input !== "object") return null
  const o = input as Record<string, unknown>
  for (const k of DETAIL_KEYS) {
    const v = o[k]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

export function describeCall(call: ToolCall): DescribedCall {
  const detail = pickDetail(call.input)
  const hit = MAP[call.name]
  if (hit) return { ...hit, detail }
  // Opzoek-/lees-tools en onbekende namen: geen module, alleen een nette naam.
  if (/^(find|get|list)_/.test(call.name)) return { action: "Opgezocht", module: null, href: null, detail }
  return { action: call.name.replace(/_/g, " "), module: null, href: null, detail }
}
