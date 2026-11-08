import { resetCardImage } from '../../../lib/images'

/** Ersatz entfernen: wieder das Bild aus der Quelle (Scryfall, TCGdex, YGOPRODeck). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await resetCardImage(mediaDb(), useMediaStore(), getRouterParam(event, 'id')!)
  return { ok: true }
})
