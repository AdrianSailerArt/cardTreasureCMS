import { listSealedAdmin } from '../../lib/sealed'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const game = getQuery(event).game
  return await listSealedAdmin(mediaDb(), typeof game === 'string' && game ? game : null)
})
