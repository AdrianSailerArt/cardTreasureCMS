/**
 * Provision pflegen: an die interne Shop-API weiterreichen (dort geprüft, protokolliert, Verkäufer benachrichtigt).
 *   GET  /api/commission                       Staffel und Freigaben
 *   PUT  /api/commission/tiers                 Staffel ändern
 *   POST /api/commission/overrides             Freigabe erteilen
 *   POST /api/commission/overrides/<id>/end    Freigabe beenden
 *   GET  /api/commission/seller/<id>           Satz und Freigaben eines Verkäufers
 */
const ALLOWED = [/^$/, /^tiers$/, /^overrides$/, /^overrides\/[0-9a-f-]{36}\/end$/, /^seller\/[^/]+$/]

export default defineEventHandler(async (event): Promise<unknown> => {
  const path = getRouterParam(event, 'path') ?? ''
  if (!ALLOWED.some(re => re.test(path))) throw createError({ statusCode: 404 })
  const method = event.method as 'GET' | 'POST' | 'PUT'
  if (!['GET', 'POST', 'PUT'].includes(method)) throw createError({ statusCode: 405 })
  const body = method === 'GET' ? undefined : await readBody<Record<string, unknown>>(event)
  return await shopInternal<unknown>(event, path ? `commission/${path}` : 'commission', { method, body })
})
