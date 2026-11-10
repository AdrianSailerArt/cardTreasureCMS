import { z } from 'zod'
import { listSealedAdmin } from '../../lib/sealed'

const query = z.object({ game: gameParam })

/** Sealed-Produkte, optional nur eines Spiels (?game=mtg). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { game } = await getValidatedQuery(event, query.parse)
  return await listSealedAdmin(mediaDb(), game)
})
