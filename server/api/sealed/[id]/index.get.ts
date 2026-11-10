import { sealedById } from '../../../lib/sealed'

/** Ein Sealed-Produkt zum Bearbeiten. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const row = await sealedById(mediaDb(), getRouterParam(event, 'id')!)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Produkt nicht gefunden' })
  return row
})
