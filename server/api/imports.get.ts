import { sql } from 'drizzle-orm'

/** Katalogstand je Spiel und die letzten Import-Läufe. */
export default defineEventHandler(async () => {
  const [games, runs] = await Promise.all([
    rows<{
      code: string, name: string, sets: number, setsWithCards: number, cards: number, products: number,
      withPrice: number, withGerman: number, lastSuccess: string | null
    }>(sql`
      select g.code, g.name,
             (select count(*)::int from sets s where s.game_id = g.id) as "sets",
             (select count(distinct p.set_id)::int from printings p join sets s on s.id = p.set_id where s.game_id = g.id) as "setsWithCards",
             (select count(*)::int from cards c where c.game_id = g.id) as "cards",
             (select count(*)::int from products p where p.game_id = g.id) as "products",
             (select count(distinct rp.product_id)::int from reference_prices rp join products p on p.id = rp.product_id where p.game_id = g.id) as "withPrice",
             (select count(*)::int from card_translations t join cards c on c.id = t.card_id where c.game_id = g.id and t.language = 'de') as "withGerman",
             (select max(finished_at) from import_runs r where r.game = g.code and r.status = 'succeeded') as "lastSuccess"
      from games g order by g.code
    `),
    rows<{
      id: string, game: string, status: string, args: string | null, trigger: string,
      stats: Record<string, number>, error: string | null, startedAt: string, finishedAt: string | null
    }>(sql`
      select id, game::text, status::text, args, trigger, stats, error,
             started_at as "startedAt", finished_at as "finishedAt"
      from import_runs order by started_at desc limit 40
    `),
  ])
  return { games, runs }
})
