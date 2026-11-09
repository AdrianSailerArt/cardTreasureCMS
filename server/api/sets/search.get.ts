import { sql } from 'drizzle-orm'

/** Sets eines Spiels nach Name oder Kürzel (für die Set-Auswahl bei Sealed-Produkten). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { game, q } = getQuery(event) as { game?: string, q?: string }
  if (!game || !q || q.trim().length < 2) return []
  return await rows<{ id: string, code: string, name: string, releaseDate: string | null }>(sql`
    select s.id, s.code, s.name, to_char(s.release_date, 'YYYY-MM-DD') as "releaseDate"
    from sets s join games g on g.id = s.game_id
    where g.code = ${game} and (s.name ilike ${`%${q.trim()}%`} or s.code ilike ${q.trim()})
    order by s.release_date desc nulls last limit 20
  `)
})
