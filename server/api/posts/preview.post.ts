import { z } from 'zod'

const body = z.object({ markdown: z.string().max(200_000), locale: z.enum(['de', 'en']) })

export default defineEventHandler(async (event) => {
  const { markdown, locale } = body.parse(await readBody(event))
  return await renderPreview(markdown, locale)
})
