import { setSealedImage } from '../../../lib/sealed'

/** Produktbild hochladen (multipart, Feld "file"). */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const { file } = await readUpload(event)
  return await runMediaAction(() => setSealedImage(mediaDb(), useMediaStore(), admin.id, getRouterParam(event, 'id')!, file))
})
