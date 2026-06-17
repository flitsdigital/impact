import * as db from './db'

// Provider-agnostische tool-definitie (OpenAI-compatibel function-calling formaat:
// werkt met Groq, Gemini en OpenAI). Elke tool is een dunne wrapper om de datalaag.
// `find_*` geven kandidaten terug (JSON) zodat het model kan kiezen of terugvragen;
// de actie-tools voeren een omkeerbare wijziging uit. Validatie van enum-waarden
// gebeurt via de JSON-schema (het model) én de DB-check-constraints (vangnet).
export interface AssistantTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  run: (args: Record<string, any>) => Promise<string>
}

export interface ToolContext {
  profileId: string
  today: string // YYYY-MM-DD
  record: (name: string, input: unknown) => void
}

const obj = (
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> => ({ type: 'object', properties, required, additionalProperties: false })

const str = (description: string) => ({ type: 'string', description })
const enumStr = (values: string[], description?: string) => ({ type: 'string', enum: values, ...(description ? { description } : {}) })

export function buildTools(ctx: ToolContext): AssistantTool[] {
  // Wrap elke run met audit-logging en foutafvang (geeft nette string terug).
  const t = (
    name: string,
    description: string,
    parameters: Record<string, unknown>,
    run: (a: Record<string, any>) => Promise<string>,
  ): AssistantTool => ({
    name,
    description,
    parameters,
    run: async (args) => {
      ctx.record(name, args)
      try {
        return await run(args)
      } catch (e) {
        return `Fout: ${(e as Error).message}`
      }
    },
  })

  return [
    // ── Leads ────────────────────────────────────────────────────────────────
    t(
      'find_lead',
      'Zoek leads op bedrijfs- of contactnaam. Roep dit aan vóór log_contactmoment of set_lead_status om de juiste lead_id te vinden. Geeft kandidaten terug; bij meerdere: vraag de gebruiker welke.',
      obj({ query: str('naam of deel van de naam') }, ['query']),
      async (a) => JSON.stringify(await db.searchLeads(a.query)),
    ),
    t(
      'log_contactmoment',
      'Log een contactmoment bij een lead. Gebruik dit als de gebruiker vertelt dat hij contact had met een lead.',
      obj(
        {
          lead_id: str('id van de lead'),
          type: enumStr(['gebeld', 'gemaild', 'meeting', 'notitie']),
          notitie: str('korte samenvatting van wat besproken/gebeurd is'),
          datum: str('YYYY-MM-DD; laat weg voor vandaag'),
        },
        ['lead_id', 'type', 'notitie'],
      ),
      async (a) => {
        await db.addContactmoment({
          profileId: ctx.profileId,
          leadId: a.lead_id,
          type: a.type,
          datum: a.datum ?? ctx.today,
          notitie: a.notitie,
        })
        return 'contactmoment gelogd'
      },
    ),
    t(
      'set_lead_status',
      'Wijzig de pipeline-status van een lead. Omkeerbaar.',
      obj(
        { lead_id: str('id van de lead'), status: enumStr(['nieuw', 'contact', 'offerte', 'gewonnen', 'verloren']) },
        ['lead_id', 'status'],
      ),
      async (a) => {
        await db.setLeadStatus(a.lead_id, a.status)
        return `status → ${a.status}`
      },
    ),
    t(
      'create_lead',
      'Maak een nieuwe lead aan. Gebruik dit als find_lead niets vond en de gebruiker duidelijk een nieuwe lead wil aanmaken.',
      obj(
        {
          bedrijfsnaam: str('bedrijfs- of leadnaam'),
          contactpersoon: str('contactpersoon (optioneel)'),
          email: str('e-mail (optioneel)'),
          telefoon: str('telefoon (optioneel)'),
          notities: str('notitie (optioneel)'),
        },
        ['bedrijfsnaam'],
      ),
      async (a) => {
        await db.createLead({
          bedrijfsnaam: a.bedrijfsnaam,
          contactpersoon: a.contactpersoon ?? null,
          email: a.email ?? null,
          telefoon: a.telefoon ?? null,
          notities: a.notities ?? null,
        })
        return `lead "${a.bedrijfsnaam}" aangemaakt`
      },
    ),

    // ── Klanten ──────────────────────────────────────────────────────────────
    t(
      'find_klant',
      'Zoek klanten op naam. Geeft naam, status en notities terug — ook bruikbaar om een vraag over een klant te beantwoorden.',
      obj({ query: str('naam of deel van de naam') }, ['query']),
      async (a) => JSON.stringify(await db.searchKlanten(a.query)),
    ),
    t(
      'add_klant_note',
      'Voeg een notitie toe aan een klant (klanten hebben geen losse contactmomenten, alleen een notitieveld).',
      obj({ klant_id: str('id van de klant'), tekst: str('de notitie') }, ['klant_id', 'tekst']),
      async (a) => {
        await db.appendKlantNote(a.klant_id, a.tekst, ctx.today)
        return 'notitie toegevoegd'
      },
    ),

    // ── Content / posts ────────────────────────────────────────────────────────
    t(
      'find_post',
      'Zoek posts op klantnaam of caption. Vind de post_id vóór set_post_status of reschedule_post.',
      obj({ query: str('klantnaam of deel van de caption') }, ['query']),
      async (a) => JSON.stringify(await db.searchPosts(a.query)),
    ),
    t(
      'create_post',
      'Maak een nieuwe (lege) post aan. Media kan niet via spraak; status begint op te_doen.',
      obj(
        {
          type: enumStr(['foto', 'video', 'reel', 'carousel']),
          klant_id: str('id van de klant (optioneel)'),
          caption: str('caption (optioneel)'),
          scheduled_at: str('YYYY-MM-DD (optioneel)'),
        },
        ['type'],
      ),
      async (a) => {
        await db.createPost({
          klantId: a.klant_id ?? null,
          type: a.type,
          caption: a.caption ?? null,
          scheduledAt: a.scheduled_at ?? null,
        })
        return 'post aangemaakt'
      },
    ),
    t(
      'set_post_status',
      'Wijzig de status van een post in de content-pipeline.',
      obj(
        { post_id: str('id van de post'), status: enumStr(['te_doen', 'bezig', 'klaar_voor_feedback', 'akkoord', 'gepost']) },
        ['post_id', 'status'],
      ),
      async (a) => {
        await db.setPostStatus({ profileId: ctx.profileId, postId: a.post_id, status: a.status })
        return `status → ${a.status}`
      },
    ),
    t(
      'reschedule_post',
      'Verzet de geplande datum van een post.',
      obj({ post_id: str('id van de post'), datum: str('YYYY-MM-DD') }, ['post_id', 'datum']),
      async (a) => {
        await db.reschedulePost({ profileId: ctx.profileId, postId: a.post_id, datum: a.datum })
        return `verzet naar ${a.datum}`
      },
    ),

    // ── Projecten ────────────────────────────────────────────────────────────
    t(
      'find_project',
      'Zoek projecten op naam of klantnaam. Vind het project_id vóór create_task.',
      obj({ query: str('project- of klantnaam') }, ['query']),
      async (a) => JSON.stringify(await db.searchProjects(a.query)),
    ),
    t(
      'create_task',
      'Maak een taak aan binnen een project.',
      obj(
        {
          project_id: str('id van het project'),
          titel: str('titel van de taak'),
          beschrijving: str('beschrijving (optioneel)'),
          deadline: str('YYYY-MM-DD (optioneel)'),
          prioriteit: enumStr(['urgent', 'hoog', 'normaal', 'laag'], 'optioneel'),
        },
        ['project_id', 'titel'],
      ),
      async (a) => {
        await db.createTask({
          projectId: a.project_id,
          titel: a.titel,
          beschrijving: a.beschrijving ?? null,
          deadline: a.deadline ?? null,
          prioriteit: a.prioriteit ?? null,
        })
        return 'taak aangemaakt'
      },
    ),
    t(
      'set_task_status',
      'Wijzig de status van een taak.',
      obj({ task_id: str('id van de taak'), status: enumStr(['todo', 'bezig', 'feedback', 'klaar']) }, ['task_id', 'status']),
      async (a) => {
        await db.setTaskStatus(a.task_id, a.status)
        return `status → ${a.status}`
      },
    ),

    // ── Persoonlijke taken (todolijst, niet project-gebonden) ──────────────────
    t(
      'add_todo',
      'Zet een taak op de persoonlijke todolijst van de gebruiker (de "Mijn taken"-lijst, NIET gekoppeld aan een project). Gebruik dit voor losse to-do\'s die de gebruiker voor zichzelf wil onthouden ("zet op mijn lijst", "ik moet nog…"). Voor taken binnen een project gebruik je create_task.',
      obj(
        {
          titel: str('wat er gedaan moet worden'),
          deadline: str('YYYY-MM-DD (optioneel)'),
          prioriteit: enumStr(['urgent', 'hoog', 'normaal', 'laag'], 'optioneel'),
        },
        ['titel'],
      ),
      async (a) => {
        await db.createTodo({
          profileId: ctx.profileId,
          titel: a.titel,
          deadline: a.deadline ?? null,
          prioriteit: a.prioriteit ?? null,
        })
        return `todo "${a.titel}" toegevoegd`
      },
    ),
    t(
      'list_todos',
      'Toon de persoonlijke todolijst van de gebruiker (alleen van henzelf). Standaard alleen openstaande; zet include_done op true voor ook afgevinkte. Gebruik dit om het juiste todo_id te vinden vóór complete_todo of delete_todo, en om vragen als "wat staat er op mijn lijst?" te beantwoorden.',
      obj({ include_done: { type: 'boolean', description: 'ook afgevinkte tonen' } }),
      async (a) => JSON.stringify(await db.listTodos(ctx.profileId, a.include_done === true)),
    ),
    t(
      'complete_todo',
      'Vink een persoonlijke todo af (markeer als klaar). Vind eerst het todo_id met list_todos.',
      obj({ todo_id: str('id van de todo (uit list_todos)') }, ['todo_id']),
      async (a) => {
        await db.completeTodo(ctx.profileId, a.todo_id)
        return 'todo afgevinkt'
      },
    ),
    t(
      'delete_todo',
      'Verwijder een persoonlijke todo. Vind eerst het todo_id met list_todos.',
      obj({ todo_id: str('id van de todo (uit list_todos)') }, ['todo_id']),
      async (a) => {
        await db.deleteTodoById(ctx.profileId, a.todo_id)
        return 'todo verwijderd'
      },
    ),

    // ── A. Inzicht / vragen (alleen-lezen) ─────────────────────────────────────
    t(
      'find_stale_leads',
      'Geef leads die al een tijd geen contact hebben gehad. Gebruik dit bij vragen als "welke leads heb ik niet meer gesproken?".',
      obj({ days: { type: 'number', description: 'aantal dagen zonder contact; standaard 7' } }),
      async (a) => JSON.stringify(await db.findStaleLeads(Number(a.days) || 7)),
    ),
    t(
      'get_agenda',
      'Wat staat er gepland: posts (op datum) + taken (met deadline) voor vandaag of deze week.',
      obj({ period: enumStr(['vandaag', 'deze_week']) }, ['period']),
      async (a) => JSON.stringify(await db.getAgenda(a.period)),
    ),
    t(
      'get_pipeline_value',
      'Totale pipeline-waarde van open leads, per status en totaal.',
      obj({}),
      async () => JSON.stringify(await db.getPipelineValue()),
    ),
    t(
      'get_open_tasks',
      'Open taken (niet klaar). Zet only_overdue op true voor alleen taken over hun deadline.',
      obj({ only_overdue: { type: 'boolean', description: 'alleen taken over deadline' } }),
      async (a) => JSON.stringify(await db.getOpenTasks(a.only_overdue === true)),
    ),
    t(
      'get_open_invoices',
      'Openstaande facturen (gepland/verzonden/te laat) met totaalbedrag.',
      obj({}),
      async () => JSON.stringify(await db.getOpenInvoices()),
    ),

    // ── B. CRUD afmaken ────────────────────────────────────────────────────────
    t(
      'create_klant',
      'Maak een nieuwe klant aan.',
      obj(
        {
          naam: str('naam van de klant'),
          type: enumStr(['recurring', 'project', 'one-off'], 'optioneel'),
          contactpersoon: str('optioneel'),
          email: str('optioneel'),
          telefoon: str('optioneel'),
        },
        ['naam'],
      ),
      async (a) => {
        await db.createKlant(a as any)
        return `klant "${a.naam}" aangemaakt`
      },
    ),
    t(
      'update_klant',
      'Werk velden van een klant bij (alleen de meegegeven velden).',
      obj({
        klant_id: str('id van de klant'),
        status: enumStr(['actief', 'gepauzeerd', 'gearchiveerd'], 'optioneel'),
        contactpersoon: str('optioneel'),
        email: str('optioneel'),
        telefoon: str('optioneel'),
        volgende_factuur: str('YYYY-MM-DD, optioneel'),
      }, ['klant_id']),
      async (a) => {
        await db.updateKlant(a.klant_id, {
          status: a.status, contactpersoon: a.contactpersoon, email: a.email,
          telefoon: a.telefoon, volgende_factuur: a.volgende_factuur,
        })
        return 'klant bijgewerkt'
      },
    ),
    t(
      'update_lead',
      'Werk velden van een lead bij (waarde, contactpersoon, e-mail, telefoon).',
      obj({
        lead_id: str('id van de lead'),
        waarde: { type: 'number', description: 'dealwaarde in euro, optioneel' },
        contactpersoon: str('optioneel'),
        email: str('optioneel'),
        telefoon: str('optioneel'),
      }, ['lead_id']),
      async (a) => {
        await db.updateLead(a.lead_id, {
          waarde: a.waarde, contactpersoon: a.contactpersoon, email: a.email, telefoon: a.telefoon,
        })
        return 'lead bijgewerkt'
      },
    ),
    t(
      'create_project',
      'Maak een nieuw project aan (optioneel gekoppeld aan een klant).',
      obj({ naam: str('projectnaam'), klant_id: str('optioneel'), deadline: str('YYYY-MM-DD, optioneel') }, ['naam']),
      async (a) => {
        await db.createProject({ naam: a.naam, klantId: a.klant_id ?? null, deadline: a.deadline ?? null })
        return `project "${a.naam}" aangemaakt`
      },
    ),
    t(
      'set_project_status',
      'Wijzig de status van een project.',
      obj({ project_id: str('id van het project'), status: enumStr(['gepland', 'bezig', 'feedback', 'klaar', 'gearchiveerd']) }, ['project_id', 'status']),
      async (a) => {
        await db.setProjectStatus(a.project_id, a.status)
        return `status → ${a.status}`
      },
    ),
    t(
      'update_task',
      'Werk een taak bij: deadline en/of prioriteit.',
      obj({
        task_id: str('id van de taak'),
        deadline: str('YYYY-MM-DD, optioneel'),
        prioriteit: enumStr(['urgent', 'hoog', 'normaal', 'laag'], 'optioneel'),
      }, ['task_id']),
      async (a) => {
        await db.updateTask(a.task_id, { deadline: a.deadline, prioriteit: a.prioriteit })
        return 'taak bijgewerkt'
      },
    ),
    t(
      'add_task_comment',
      'Plaats een opmerking bij een taak.',
      obj({ task_id: str('id van de taak'), inhoud: str('de opmerking') }, ['task_id', 'inhoud']),
      async (a) => {
        await db.addTaskComment({ profileId: ctx.profileId, taskId: a.task_id, inhoud: a.inhoud })
        return 'opmerking geplaatst'
      },
    ),

    // ── C. Team / toewijzen ────────────────────────────────────────────────────
    t(
      'find_teammember',
      'Zoek een teamlid op naam of e-mail. Vind het profile_id vóór assign_task of assign_post.',
      obj({ query: str('naam of deel van de naam') }, ['query']),
      async (a) => JSON.stringify(await db.searchTeam(a.query)),
    ),
    t(
      'assign_task',
      'Wijs een taak toe aan een teamlid.',
      obj({ task_id: str('id van de taak'), profile_id: str('id van het teamlid') }, ['task_id', 'profile_id']),
      async (a) => {
        await db.assignTask(a.task_id, a.profile_id)
        return 'taak toegewezen'
      },
    ),
    t(
      'assign_post',
      'Wijs een post toe aan een teamlid.',
      obj({ post_id: str('id van de post'), profile_id: str('id van het teamlid') }, ['post_id', 'profile_id']),
      async (a) => {
        await db.assignPost(a.post_id, a.profile_id)
        return 'post toegewezen'
      },
    ),
  ]
}
