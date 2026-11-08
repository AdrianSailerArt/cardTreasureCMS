import { sql } from 'drizzle-orm'
import { z } from 'zod'

const query = z.object({ q: z.string().trim().min(2).max(100) })

/** Kartensuche für den Kartenverweis-Picker im Blog-Editor. */
export default defineEventHandler(async (event) => {
  const parsed = query.safeParse(getQuery(event))
  if (!parsed.success) return []
  const { q } = parsed.data
  const pattern = `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`
  return await rows<{ ref: string, name: string, nameDe: string | null, game: string, setName: string | null }>(sql`
    select g.code || '/' || c.slug as ref, c.name, de.name as "nameDe", g.code as game,
           (select s.name from printings p join sets s on s.id = p.set_id where p.card_id = c.id
             order by s.release_date desc nulls last limit 1) as "setName"
    from cards c
    join games g on g.id = c.game_id
    left join card_translations de on de.card_id = c.id and de.language = 'de'
    where c.name ilike ${pattern} or de.name ilike ${pattern}
    order by greatest(similarity(c.name, ${q}), coalesce(similarity(de.name, ${q}), 0)) desc
    limit 15
  `)
})
