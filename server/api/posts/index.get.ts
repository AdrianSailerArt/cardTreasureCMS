import { sql } from 'drizzle-orm'

/** Alle Beiträge (auch Entwürfe), zuletzt geänderte zuerst. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return await rows<{
    id: string, slug: string, status: string, titleDe: string | null, titleEn: string | null,
    author: string, game: string | null, publishedAt: string | null, updatedAt: string, cardRefs: number
  }>(sql`
    select p.id, p.slug, p.status::text,
           de.title as "titleDe", en.title as "titleEn",
           u.name as author, g.code as game,
           p.published_at as "publishedAt", p.updated_at as "updatedAt",
           (select count(*)::int from post_card_refs r where r.post_id = p.id) as "cardRefs"
    from posts p
    join "user" u on u.id = p.author_id
    left join games g on g.id = p.game_id
    left join post_translations de on de.post_id = p.id and de.locale = 'de'
    left join post_translations en on en.post_id = p.id and en.locale = 'en'
    order by p.updated_at desc
  `)
})
