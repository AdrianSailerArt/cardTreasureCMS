import { sql } from 'drizzle-orm'
import { z } from 'zod'

const query = z.object({ bad: flagParam })

/** Neueste Bewertungen (Käufer über Verkäufer); ?bad=1 nur 1–2 Sterne oder unvollständig geliefert. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { bad } = await getValidatedQuery(event, query.parse)
  return await rows<{ id: string, ratingOverall: number, deliveredComplete: boolean, comment: string | null, hidden: boolean, createdAt: string, authorId: string, author: string, subjectId: string, subject: string, orderNumber: string }>(sql`
    select r.id, r.rating_overall as "ratingOverall", r.delivered_complete as "deliveredComplete", r.comment,
           (r.comment_hidden_at is not null) as hidden, r.created_at as "createdAt",
           r.author_id as "authorId", a.name as author, r.subject_id as "subjectId", coalesce(sp.display_name, s.name) as subject, o.number as "orderNumber"
    from reviews r
    join "user" a on a.id = r.author_id join "user" s on s.id = r.subject_id
    left join seller_profiles sp on sp.user_id = r.subject_id
    join shipments sh on sh.id = r.shipment_id join orders o on o.id = sh.order_id
    where r.direction = 'buyer_to_seller' ${bad ? sql`and (r.rating_overall <= 2 or not r.delivered_complete)` : sql``}
    order by r.created_at desc limit 100
  `)
})
