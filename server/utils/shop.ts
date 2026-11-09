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
