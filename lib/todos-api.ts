// Gedeelde stukken voor de server-to-server todo-API (app/api/todos).
// Server-only: leest een secret uit env. Nooit importeren in client-code.

/** Houd in sync met de SELECT in app/(app)/_actions/todos.ts. */
export const TODO_SELECT =
  '*, assignees:todo_assignees ( profile_id, profiles ( id, full_name, avatar_url ) )'

/** Beveiliging: gedeeld geheim in header `x-api-secret` (zoals /api/assistant). */
export function apiAuthorized(req: Request): boolean {
  const secret = process.env.TODOS_API_SECRET
  return Boolean(secret) && req.headers.get('x-api-secret') === secret
}
