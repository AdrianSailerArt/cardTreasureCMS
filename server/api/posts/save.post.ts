import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

const translation = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(500).nullish(),
  bodyMd: z.string().max(200_000),
})

const body = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche'),
  status: z.enum(['draft', 'published', 'archived']),
  game: z.enum(['mtg', 'pokemon', 'yugioh']).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  translations: z.object({ de: translation.optional(), en: translation.optional() })
    .refine(t => t.de || t.en, 'Mindestens eine Sprache ausfüllen'),
})

/** Legt einen Beitrag an oder aktualisiert ihn, inklusive Übersetzungen und Kartenverweisen. */
export default defineEventHandler(async (event) => {
  const admin = event.context.admin as AdminUser
  const input = await readValidatedBody(event, body.parse)
  const db = useDb()

  const [game] = input.game ? await db.select().from(schema.games).where(eq(schema.games.code, input.game)) : []
  const allMarkdown = [input.translations.de?.bodyMd, input.translations.en?.bodyMd].filter(Boolean).join('\n')
  const refs = await resolveRefs(extractRefs(allMarkdown))

  const clash = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, input.slug))
  if (clash.some(p => p.id !== input.id)) throw createError({ statusCode: 409, statusMessage: 'Slug ist schon vergeben' })

  const id = await db.transaction(async (tx) => {
    const values = {
      slug: input.slug,
      status: input.status,
      gameId: game?.id ?? null,
      tags: input.tags,
      updatedAt: sql`now()`,
      publishedAt: input.status === 'published' ? sql`coalesce(${schema.posts.publishedAt}, now())` : sql`${schema.posts.publishedAt}`,
    }
    let postId = input.id
    if (postId) {
      const updated = await tx.update(schema.posts).set(values).where(eq(schema.posts.id, postId)).returning({ id: schema.posts.id })
      if (!updated.length) throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden' })
    }
    else {
      const [created] = await tx.insert(schema.posts).values({
        ...values,
        authorId: admin.id,
        publishedAt: input.status === 'published' ? sql`now()` : null,
      }).returning({ id: schema.posts.id })
      postId = created!.id
    }

    await tx.delete(schema.postTranslations).where(eq(schema.postTranslations.postId, postId))
    const tr = (['de', 'en'] as const).flatMap(locale => input.translations[locale]
      ? [{ postId: postId!, locale, title: input.translations[locale]!.title, excerpt: input.translations[locale]!.excerpt ?? null, bodyMd: input.translations[locale]!.bodyMd }]
      : [])
    await tx.insert(schema.postTranslations).values(tr)

    await tx.delete(schema.postCardRefs).where(eq(schema.postCardRefs.postId, postId))
    if (refs.size) await tx.insert(schema.postCardRefs).values([...refs.values()].map(r => ({ postId: postId!, cardId: r.id })))
    return postId
  })

  return { id, cardRefs: refs.size }
})
