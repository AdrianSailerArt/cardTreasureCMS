import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb()
  const [post] = await db.select().from(schema.posts).where(eq(schema.posts.id, id))
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden' })
  const translations = await db.select().from(schema.postTranslations).where(eq(schema.postTranslations.postId, id))
  const [game] = post.gameId ? await db.select().from(schema.games).where(eq(schema.games.id, post.gameId)) : []
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    game: game?.code ?? null,
    tags: post.tags,
    coverImagePath: post.coverImagePath,
    publishedAt: post.publishedAt,
    translations: Object.fromEntries(translations.map(t => [t.locale, { title: t.title, excerpt: t.excerpt, bodyMd: t.bodyMd }])),
  }
})
