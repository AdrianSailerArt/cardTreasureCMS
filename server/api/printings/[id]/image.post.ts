import { replaceCardImage } from '../../../lib/images'

/** Kartenbild eines Drucks ersetzen (multipart: file, optional reason). Der Shop zeigt sofort den Ersatz. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const { file, fields } = await readUpload(event)
  const reason = fields.reason?.trim().slice(0, 300) || null
  return await runMediaAction(() => replaceCardImage(mediaDb(), useMediaStore(), admin.id, getRouterParam(event, 'id')!, file, reason))
})
