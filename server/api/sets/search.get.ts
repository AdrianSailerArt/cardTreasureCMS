import { sql } from 'drizzle-orm'
import { z } from 'zod'

const query = z.object({ game: z.enum(GAMES), q: z.string().trim().min(2).max(100) })

/** Sets eines Spiels nach Name oder Kürzel (für die Set-Auswahl bei Sealed-Produkten). Ungültige Eingaben liefern eine leere Liste. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = query.safeParse(getQuery(event))
  if (!parsed.success) return []
  const { game, q } = parsed.data
  return await rows<{ id: string, code: string, name: string, releaseDate: string | null }>(sql`
    select s.id, s.code, s.name, to_char(s.release_date, 'YYYY-MM-DD') as "releaseDate"
    from sets s join games g on g.id = s.game_id
    where g.code = ${game} and (s.name ilike ${`%${q}%`} or s.code ilike ${q})
    order by s.release_date desc nulls last limit 20
  `)
})
