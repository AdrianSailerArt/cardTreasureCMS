import { sql } from 'drizzle-orm'

/** Ein Kunde mit Art (privat/gewerblich), Profilangaben, Kennzahlen, Angeboten, Bewertungen und Moderations-Protokoll. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const [user] = await rows<{ id: string, name: string, email: string, role: string, locale: string, createdAt: string, blockedAt: string | null, blockedReason: string | null, blockedUntil: string | null, isDemo: boolean, displayName: string | null, sellerType: 'private' | 'commercial', companyName: string | null, vatId: string | null, country: string | null, purchases: number, sales: number, balanceCents: number }>(sql`
    select u.id, u.name, u.email, u.role::text as role, u.locale::text as locale, u.created_at as "createdAt",
           u.blocked_at as "blockedAt", u.blocked_reason as "blockedReason", u.blocked_until as "blockedUntil", u.is_demo as "isDemo",
           sp.display_name as "displayName", coalesce(sp.type::text, 'private') as "sellerType", sp.company_name as "companyName", sp.vat_id as "vatId", sp.country,
           (select count(*)::int from orders o where o.buyer_id = u.id) as purchases,
           (select count(*)::int from shipments s where s.seller_id = u.id and s.status not in ('cancelled', 'awaiting_payment')) as sales,
           (select coalesce(sum(amount_cents), 0)::int from ledger_entries l where l.user_id = u.id) as "balanceCents"
    from "user" u left join seller_profiles sp on sp.user_id = u.id where u.id = ${id}
  `)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden' })
  const [listings, reviews, log] = await Promise.all([
    rows<{ id: string, name: string, game: string, slug: string | null, kind: string, condition: string | null, priceCents: number, quantity: number, status: string }>(sql`
      select l.id, pr.name, g.code::text as game, coalesce(c.slug, pr.slug) as slug, pr.kind::text as kind, l.condition::text as condition,
             l.price_cents as "priceCents", l.quantity, l.status::text as status
      from listings l join products pr on pr.id = l.product_id join games g on g.id = pr.game_id
      left join printings p on p.id = pr.printing_id left join cards c on c.id = p.card_id
      where l.seller_id = ${id} and l.status <> 'removed'
      order by (l.status = 'active') desc, l.price_cents desc limit 100
    `),
    rows<{ id: string, direction: string, ratingOverall: number, deliveredComplete: boolean, comment: string | null, hidden: boolean, createdAt: string, otherId: string, other: string }>(sql`
      select r.id, case when r.subject_id = ${id} then 'received' else 'given' end as direction, r.rating_overall as "ratingOverall",
             r.delivered_complete as "deliveredComplete", r.comment, (r.comment_hidden_at is not null) as hidden, r.created_at as "createdAt",
             case when r.subject_id = ${id} then r.author_id else r.subject_id end as "otherId",
             (select name from "user" where id = case when r.subject_id = ${id} then r.author_id else r.subject_id end) as other
      from reviews r where (r.subject_id = ${id} or r.author_id = ${id}) and r.direction = 'buyer_to_seller'
      order by r.created_at desc limit 50
    `),
    rows<{ id: string, action: string, reason: string | null, createdAt: string, admin: string | null, targetType: string }>(sql`
      select ml.id, ml.action, ml.reason, ml.created_at as "createdAt", a.name as admin, ml.target_type as "targetType"
      from moderation_log ml left join "user" a on a.id = ml.admin_id
      where (ml.target_type = 'user' and ml.target_id = ${id})
         or (ml.target_type = 'listing' and ml.target_id in (select id::text from listings where seller_id = ${id}))
         or (ml.target_type = 'review' and ml.target_id in (select id::text from reviews where author_id = ${id} or subject_id = ${id}))
      order by ml.created_at desc limit 50
    `),
  ])
  return { user, listings, reviews, log }
})
