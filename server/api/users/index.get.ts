import { sql } from 'drizzle-orm'

/** Kunden suchen (Name, E-Mail, Anzeigename); ohne Suche die neuesten. ?blocked=1 nur gesperrte, ?kind=private|commercial nach Art. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { q, blocked, kind } = getQuery(event) as { q?: string, blocked?: string, kind?: string }
  const text = q?.trim()
  return await rows<{ id: string, name: string, email: string, role: string, displayName: string | null, sellerType: 'private' | 'commercial', companyName: string | null, country: string | null, createdAt: string, blocked: boolean, isDemo: boolean, purchases: number, sales: number, balanceCents: number }>(sql`
    select u.id, u.name, u.email, u.role::text as role, sp.display_name as "displayName", coalesce(sp.type::text, 'private') as "sellerType", sp.company_name as "companyName", sp.country, u.created_at as "createdAt",
           (u.blocked_at is not null) as blocked, u.is_demo as "isDemo",
           (select count(*)::int from orders o where o.buyer_id = u.id) as purchases,
           (select count(*)::int from shipments s where s.seller_id = u.id and s.status <> 'cancelled') as sales,
           (select coalesce(sum(amount_cents), 0)::int from ledger_entries l where l.user_id = u.id) as "balanceCents"
    from "user" u left join seller_profiles sp on sp.user_id = u.id
    where true
      ${text && text.length >= 2 ? sql`and (u.name ilike ${`%${text}%`} or u.email ilike ${`%${text}%`} or sp.display_name ilike ${`%${text}%`})` : sql``}
      ${blocked === '1' ? sql`and u.blocked_at is not null` : sql``}
      ${kind === 'commercial' ? sql`and sp.type = 'commercial'` : kind === 'private' ? sql`and (sp.type is null or sp.type = 'private')` : sql``}
    order by u.created_at desc limit 100
  `)
})
