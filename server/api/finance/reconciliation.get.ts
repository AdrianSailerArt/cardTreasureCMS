import type { Reconciliation } from '~/types/admin'

/** Kassenabgleich aus dem Shop (interne API): Buchungen gegen Stripe, Deckung, Ertrag. */
export default defineEventHandler(async (event): Promise<Reconciliation> => await shopInternal(event, 'finance/reconciliation'))
