import type { CustomerCartExpiries } from '~/types/admin'

/** Abgelaufene Warenkörbe eines Kunden. */
export default defineEventHandler(async (event): Promise<CustomerCartExpiries> =>
  await shopInternal(event, `cart-expirations/${encodeURIComponent(getRouterParam(event, 'userId')!)}`))
