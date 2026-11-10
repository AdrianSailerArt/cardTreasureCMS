import { z } from 'zod'

const params = z.object({ id: z.string().uuid() })
const body = z.object({ resolution: z.string().trim().min(3).max(500) })

/** Vorfall im Zahlungsverkehr als erledigt markieren (im Shop gespeichert, mit Notiz und Admin). */
export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const { id } = await getValidatedRouterParams(event, params.parse)
  const input = await readValidatedBody(event, body.parse)
  return await shopInternal(event, `finance/incidents/${id}/resolve`, { method: 'POST', body: input })
})
