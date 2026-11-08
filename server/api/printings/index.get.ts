import { sql } from 'drizzle-orm'

export interface PrintingImageRow {
  id: string
  game: string
  cardName: string
  cardNameDe: string | null
  setCode: string
  setName: string
  collectorNumber: string | null
  sourceImageUrl: string | null
  overrideMediaId: string | null
  overrideReason: string | null
  overrideAt: string | null
  overrideBy: string | null
}

/**
 * Drucke für den Bildaustausch: Suche nach Kartenname (de/en) oder Set-Kürzel, ohne Suche die zuletzt ersetzten.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = String(getQuery(event).q ?? '').trim()
  const filter = q.length >= 2
    ? sql`(c.name ilike ${`%${q}%`} or exists (select 1 from card_translations t where t.card_id = c.id and t.name ilike ${`%${q}%`}) or s.code ilike ${q})`
    : sql`o.printing_id is not null`
  return await rows<PrintingImageRow>(sql`
    select p.id, g.code::text as game, c.name as "cardName",
           (select t.name from card_translations t where t.card_id = c.id and t.language = 'de' limit 1) as "cardNameDe",
           s.code as "setCode", s.name as "setName", p.collector_number as "collectorNumber", p.source_image_url as "sourceImageUrl",
           o.media_id as "overrideMediaId", o.reason as "overrideReason", o.created_at as "overrideAt", u.name as "overrideBy"
    from printings p
    join cards c on c.id = p.card_id
    join sets s on s.id = p.set_id
    join games g on g.id = c.game_id
    left join printing_image_overrides o on o.printing_id = p.id
    left join "user" u on u.id = o.replaced_by
    where ${filter}
    order by o.created_at desc nulls last, c.name, s.release_date desc nulls last
    limit 60
  `)
})
