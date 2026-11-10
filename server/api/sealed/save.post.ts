import { z } from 'zod'
import { saveSealed } from '../../lib/sealed'
import { cardLanguage, sealedType } from '../../db/generated/schema'

const body = z.object({
  id: z.string().uuid().optional(),
  game: z.enum(GAMES),
  type: z.enum(sealedType.enumValues),
  name: z.string().trim().min(2).max(200),
  nameDe: z.string().trim().max(200).nullish().transform(v => v || null),
  language: z.enum(cardLanguage.enumValues),
  setId: z.string().uuid().nullish(),
  releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal('').transform(() => null)),
  ean: z.string().trim().regex(/^\d{8,14}$/, 'EAN: 8 bis 14 Ziffern').nullish().or(z.literal('').transform(() => null)),
  description: z.string().trim().max(2000).nullish().transform(v => v || null),
})

/** Sealed-Produkt anlegen oder ändern. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const input = await readValidatedBody(event, body.parse)
  return await runMediaAction(() => saveSealed(mediaDb(), admin.id, input))
})
