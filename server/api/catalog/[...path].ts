/**
 * Katalog des Shops für das CMS (Kartensuche und Kartendaten beim Anlegen eigener Angebote). Reicht an die öffentliche
 * Katalog-API des Shops weiter, damit Shop und CMS dieselben Daten und denselben Ablauf (ListingCreator) nutzen.
 *   GET /api/catalog/search?q=&game=          Karten suchen
 *   GET /api/catalog/<game>/cards/<slug>      Karte mit Drucken und Preisen
 *   GET /api/catalog/sealed/<game>?q=         Sealed-Produkte suchen (Shop: /api/sealed/<game>)
 */
const ALLOWED = [/^search$/, /^(mtg|pokemon|yugioh)\/cards\/[a-z0-9-]+$/, /^sealed\/(mtg|pokemon|yugioh)$/]

export default defineEventHandler(async (event): Promise<unknown> => {
  await requireAdmin(event)
  const path = getRouterParam(event, 'path') ?? ''
  if (!ALLOWED.some(re => re.test(path))) throw createError({ statusCode: 404 })
  const query = Object.fromEntries(Object.entries(getQuery(event)).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  try {
    const target = path.startsWith('sealed/') ? `/api/${path}` : `/api/catalog/${path}`
    return await $fetch(`${useRuntimeConfig().shopInternalUrl}${target}`, { query })
  }
  catch (e) {
    const err = e as { statusCode?: number, data?: { statusMessage?: string } }
    throw createError({ statusCode: err.statusCode ?? 502, statusMessage: err.data?.statusMessage ?? 'Shop nicht erreichbar' })
  }
})
