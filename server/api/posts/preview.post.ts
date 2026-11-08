import { z } from 'zod'

const body = z.object({ markdown: z.string().max(200_000), locale: z.enum(['de', 'en']) })

export default defineEventHandler(async (event) => {
  const { markdown, locale } = await readValidatedBody(event, body.parse)
  return await renderPreview(markdown, locale)
})
