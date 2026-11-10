import type { CartExpiryReport } from '~/types/admin'

/** Abgelaufene Warenkörbe (Auswertung, Logik im Shop: server/lib/cart-expiry.ts). ?days=30 */
export default defineEventHandler(async (event): Promise<CartExpiryReport> => {
  const { days } = getQuery(event)
  return await shopInternal(event, 'cart-expirations', { query: days ? { days: String(days) } : undefined })
})
