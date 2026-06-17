# Todo-API (`/api/todos`)

Server-to-server REST-API voor de persoonlijke todo's, bedoeld voor automatiseringen
(bv. n8n). Omzeilt RLS via de service-role client, dus de eigenaar/toegewezenen
moeten als **profiel-uuid** in de request staan.

## Auth

Elke request stuurt het gedeelde geheim mee als header:

```
x-api-secret: <TODOS_API_SECRET>
```

Zet `TODOS_API_SECRET` in de omgeving (zie `.env.example`). Zonder of met een fout
geheim → `401 Unauthorized`.

## Endpoints

### `GET /api/todos`
Lijst van taken, gesorteerd (open eerst, dan nieuwste). Query-params (optioneel):

| Param | Effect |
|---|---|
| `user_id=<uuid>` | Alleen taken waar die persoon **eigenaar óf toegewezene** is |
| `done=true\|false` | Filter op afgevinkt |

```bash
curl -H "x-api-secret: $SECRET" \
  "https://<host>/api/todos?user_id=6d9529ce-…&done=false"
# → { "todos": [ { id, titel, done, deadline, prioriteit, assignees:[…] }, … ] }
```

### `POST /api/todos`
Maakt een taak. Body:

| Veld | Verplicht | Type |
|---|---|---|
| `user_id` | ✅ | uuid (eigenaar) |
| `titel` | ✅ | string |
| `notitie` | — | string \| null |
| `deadline` | — | `YYYY-MM-DD` \| null |
| `prioriteit` | — | `urgent` \| `hoog` \| `normaal` (default) \| `laag` |
| `assignees` | — | uuid[] (toegewezen profielen) |

```bash
curl -X POST -H "x-api-secret: $SECRET" -H "content-type: application/json" \
  -d '{"user_id":"6d9529ce-…","titel":"Offerte sturen","prioriteit":"hoog","deadline":"2026-06-20"}' \
  https://<host>/api/todos
# → 201 { "todo": { … } }
```

### `PATCH /api/todos/:id`
Werkt één taak bij; elk veld optioneel. `assignees` **vervangt** de hele set.

| Veld | Type |
|---|---|
| `titel` | string |
| `notitie` | string \| null |
| `deadline` | `YYYY-MM-DD` \| `""` \| null (leeg = wissen) |
| `prioriteit` | `urgent` \| `hoog` \| `normaal` \| `laag` |
| `done` | boolean |
| `assignees` | uuid[] |

```bash
curl -X PATCH -H "x-api-secret: $SECRET" -H "content-type: application/json" \
  -d '{"done":true}' https://<host>/api/todos/<id>
# → { "todo": { … } }   (404 als de taak niet bestaat)
```

### `DELETE /api/todos/:id`
```bash
curl -X DELETE -H "x-api-secret: $SECRET" https://<host>/api/todos/<id>
# → { "ok": true }
```

## Profiel-uuid's vinden
`user_id`/`assignees` zijn `public.profiles.id` (= auth-gebruiker-id). Op te halen
uit Supabase (`select id, full_name, email from profiles`) of een eigen
profielen-endpoint.

## Foutcodes
`401` geheim ontbreekt/onjuist · `400` validatie- of DB-fout (bv. onbekende
`user_id`) · `404` taak niet gevonden (PATCH) · `500` onverwachte DB-fout.
