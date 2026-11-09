import type { SellerRisk } from '~/types/admin'

/** Verkäufer mit Risikosignalen, berechnet im Shop (gleiche Vertrauensregeln). ?all=1 für alle Verkäufer. */
export default defineEventHandler(async (event): Promise<SellerRisk[]> =>
  await shopInternal<SellerRisk[]>(event, 'risks', { query: getQuery(event).all === '1' ? { all: '1' } : {} }))
