/**
 * Werbung: an die interne Shop-API weiterreichen (dort geprüft, protokolliert, Händler benachrichtigt).
 *   GET  /api/ads                    Regeln, laufende Werbung, Werbeertrag
 *   PUT  /api/ads/settings           Regeln ändern (Mindest-/Höchstsatz, Mindestbetrag, Frist, an/aus)
 *   POST /api/ads/<listingId>/end    einzelne Werbung beenden (mit Grund)
 */
const ALLOWED = [/^settings$/, /^[0-9a-f-]{36}\/end$/]

export default defineEventHandler(async (event): Promise<unknown> => {
  const path = getRouterParam(event, 'path') ?? ''
  if (!ALLOWED.some(re => re.test(path))) throw createError({ statusCode: 404 })
  const method = event.method as 'GET' | 'POST' | 'PUT'
  if (!['GET', 'POST', 'PUT'].includes(method)) throw createError({ statusCode: 405 })
  const body = method === 'GET' ? undefined : await readBody<Record<string, unknown>>(event)
  return await shopInternal<unknown>(event, path ? `ads/${path}` : 'ads', { method, body })
})
