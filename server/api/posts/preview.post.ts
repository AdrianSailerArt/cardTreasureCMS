import { z } from 'zod'

const body = z.object({ markdown: z.string().max(200_000), locale: z.enum(['de', 'en']) })

/** Markdown eines Beitrags als HTML-Vorschau rendern (Kartenverweise aufgelöst). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { markdown, locale } = await readValidatedBody(event, body.parse)
  return await renderPreview(markdown, locale)
})
