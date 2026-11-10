import type { H3Event } from 'h3'

/**
 * Aufruf der internen Shop-API (Moderation, Risiko-Übersicht). Fachlogik liegt im Shop, das CMS prüft nur,
 * dass ein Admin angemeldet ist, und gibt dessen ID weiter. Fehler des Shops werden unverändert durchgereicht.
 */
export const shopInternal = async <T>(event: H3Event, path: string, opts: { method?: 'GET' | 'POST' | 'PUT', body?: Record<string, unknown>, query?: Record<string, string> } = {}): Promise<T> => {
  const admin = await requireAdmin(event)
  const config = useRuntimeConfig()
  try {
    const fetcher = $fetch as unknown as (url: string, o: object) => Promise<T>
    return await fetcher(`${config.shopInternalUrl}/api/internal/${path}`, {
      method: opts.method ?? 'GET',
      body: opts.body,
      query: opts.query,
      headers: { 'x-internal-secret': config.internalSecret, 'x-admin-id': admin.id },
    })
  }
  catch (e) {
    const err = e as { statusCode?: number, data?: { statusMessage?: string, message?: string } }
    throw createError({ statusCode: err.statusCode ?? 502, statusMessage: err.data?.statusMessage ?? err.data?.message ?? 'Shop nicht erreichbar' })
  }
}

type ProxyMethod = 'GET' | 'POST' | 'PUT'

/**
 * Catch-all-Route an die interne Shop-API weiterreichen: nur erlaubte Unterpfade (sonst 404) und Methoden (sonst 405),
 * Body und Query unverändert. Eingaben prüft der Shop. `prefix` ist der Pfad unter /api/internal.
 */
export const proxyShopInternal = async (event: H3Event, prefix: string, allowed: RegExp[]): Promise<unknown> => {
  const path = getRouterParam(event, 'path') ?? ''
  if (!allowed.some(re => re.test(path))) throw createError({ statusCode: 404 })
  const method = event.method as ProxyMethod
  if (!['GET', 'POST', 'PUT'].includes(method)) throw createError({ statusCode: 405 })
  const body = method === 'GET' ? undefined : await readBody<Record<string, unknown>>(event)
  const query = method === 'GET' ? Object.fromEntries(Object.entries(getQuery(event)).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])) : undefined
  return await shopInternal<unknown>(event, path ? `${prefix}/${path}` : prefix, { method, body, query })
}
