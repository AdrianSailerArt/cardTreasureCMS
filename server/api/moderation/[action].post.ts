const ACTIONS = ['block', 'unblock', 'remove-listing', 'hide-review', 'show-review']

/** Moderations-Eingriff: an die interne Shop-API weiterreichen (prüft, protokolliert, benachrichtigt). */
export default defineEventHandler(async (event): Promise<Record<string, unknown>> => {
  const action = getRouterParam(event, 'action')!
  if (!ACTIONS.includes(action)) throw createError({ statusCode: 404 })
  const body = await readBody<Record<string, unknown>>(event)
  return await shopInternal<Record<string, unknown>>(event, `moderation/${action}`, { method: 'POST', body })
})
