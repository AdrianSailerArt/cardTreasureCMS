import { sql } from 'drizzle-orm'
import { z } from 'zod'

const query = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })

/*
 * Kennzahlen des Marktplatzes für einen Zeitraum (Standard: 30 Tage) und den Vorzeitraum zum Vergleich.
 * Umsatz = Warenwert bezahlter, nicht stornierter Sendungen (ohne Versand).
 */
export default defineEventHandler(async (event) => {
  const { days } = query.parse(getQuery(event))
  const since = sql`now() - make_interval(days => ${days})`
  const prevSince = sql`now() - make_interval(days => ${days * 2})`

  const paidShipments = (from: ReturnType<typeof sql>, to: ReturnType<typeof sql>) => sql`
    select s.*, o.buyer_id, o.paid_at
    from shipments s join orders o on o.id = s.order_id
    where o.paid_at >= ${from} and o.paid_at < ${to} and s.status <> 'cancelled'
  `

  const kpi = (from: ReturnType<typeof sql>, to: ReturnType<typeof sql>) => rows<{
    gmv: number, commission: number, orders: number, shipments: number, buyers: number, items: number
  }>(sql`
    with p as (${paidShipments(from, to)})
    select coalesce(sum(p.items_cents), 0)::int as gmv,
           coalesce(sum(p.commission_cents), 0)::int as commission,
           count(distinct p.order_id)::int as orders,
           count(*)::int as shipments,
           count(distinct p.buyer_id)::int as buyers,
           coalesce((select sum(si.quantity) from shipment_items si where si.shipment_id in (select id from p)), 0)::int as items
    from p
  `)

  const [[current], [previous], [inventory], daily, byStatus, byGame, topSellers, topProducts, recentOrders] = await Promise.all([
    kpi(since, sql`now()`),
    kpi(prevSince, since),
    rows<{ activeListings: number, units: number, value: number, sellers: number, users: number, newUsers: number }>(sql`
      select (select count(*)::int from listings where status = 'active') as "activeListings",
             (select coalesce(sum(quantity), 0)::int from listings where status = 'active') as "units",
             (select coalesce(sum(quantity::bigint * price_cents), 0)::bigint from listings where status = 'active') as "value",
             (select count(distinct seller_id)::int from listings where status = 'active') as "sellers",
             (select count(*)::int from "user") as "users",
             (select count(*)::int from "user" where created_at >= ${since}) as "newUsers"
    `),
    rows<{ day: string, gmv: number, orders: number }>(sql`
      select to_char(d.day, 'YYYY-MM-DD') as day,
             coalesce(sum(s.items_cents), 0)::int as gmv,
             count(distinct s.order_id)::int as orders
      from generate_series(date_trunc('day', ${since}), date_trunc('day', now()), interval '1 day') as d(day)
      left join orders o on date_trunc('day', o.paid_at) = d.day
      left join shipments s on s.order_id = o.id and s.status <> 'cancelled'
      group by d.day order by d.day
    `),
    rows<{ status: string, count: number }>(sql`
      select status::text, count(*)::int as count from shipments group by 1 order by 2 desc
    `),
    rows<{ game: string, gmv: number, items: number }>(sql`
      with p as (${paidShipments(since, sql`now()`)})
      select g.code as game, coalesce(sum(si.quantity * si.unit_price_cents), 0)::int as gmv, coalesce(sum(si.quantity), 0)::int as items
      from p join shipment_items si on si.shipment_id = p.id
      join products pr on pr.id = si.product_id join games g on g.id = pr.game_id
      group by 1 order by 2 desc
    `),
    rows<{ name: string, type: string, country: string, gmv: number, shipments: number, rating: number | null }>(sql`
      with p as (${paidShipments(since, sql`now()`)})
      select sp.display_name as name, sp.type::text as type, sp.country,
             sum(p.items_cents)::int as gmv, count(*)::int as shipments,
             (select round(avg(r.rating_overall), 2)::float from reviews r
               where r.subject_id = sp.user_id and r.direction = 'buyer_to_seller') as rating
      from p join seller_profiles sp on sp.user_id = p.seller_id
      group by sp.user_id order by gmv desc limit 8
    `),
    rows<{ name: string, game: string, slug: string, items: number, gmv: number }>(sql`
      with p as (${paidShipments(since, sql`now()`)})
      select pr.name, g.code as game, c.slug, sum(si.quantity)::int as items, sum(si.quantity * si.unit_price_cents)::int as gmv
      from p join shipment_items si on si.shipment_id = p.id
      join products pr on pr.id = si.product_id join games g on g.id = pr.game_id
      left join printings pt on pt.id = pr.printing_id left join cards c on c.id = pt.card_id
      group by pr.id, g.code, c.slug order by gmv desc limit 8
    `),
    rows<{ number: string, buyer: string, createdAt: string, total: number, status: string, shipments: string[] }>(sql`
      select o.number, u.name as buyer, o.created_at as "createdAt", o.total_cents as total, o.status::text as status,
             array(select s.status::text from shipments s where s.order_id = o.id) as shipments
      from orders o join "user" u on u.id = o.buyer_id
      order by o.created_at desc limit 12
    `),
  ])

  return { days, current, previous, inventory, daily, byStatus, byGame, topSellers, topProducts, recentOrders }
})
