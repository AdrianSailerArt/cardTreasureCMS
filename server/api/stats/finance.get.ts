import { sql } from 'drizzle-orm'

/*
 * Plattform-Finanzen aus dem Buchungsjournal (ledger_entries) und den Sendungen:
 *   Guthaben       Summe aller Kontostände (Verbindlichkeit gegenüber Nutzern)
 *   Treuhand       bezahlte, noch nicht abgeschlossene Sendungen (Geld liegt bei uns, gehört noch niemandem)
 *   Provision      Einnahmen der Plattform
 * Monatswerte für 12 Monate.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [[totals], monthly, topBalances] = await Promise.all([
    rows<{ balancesCents: number, accounts: number, escrowCents: number, escrowShipments: number, commissionCents: number, payoutsCents: number, refundsCents: number }>(sql`
      select (select coalesce(sum(b), 0)::bigint from (select sum(amount_cents) as b from ledger_entries group by user_id having sum(amount_cents) > 0) x) as "balancesCents",
             (select count(*)::int from (select 1 from ledger_entries group by user_id having sum(amount_cents) > 0) x) as accounts,
             (select coalesce(sum(items_cents + shipping_cents), 0)::bigint from shipments where status in ('paid', 'shipped', 'delivered')) as "escrowCents",
             (select count(*)::int from shipments where status in ('paid', 'shipped', 'delivered')) as "escrowShipments",
             (select coalesce(-sum(amount_cents), 0)::bigint from ledger_entries where kind = 'commission') as "commissionCents",
             (select coalesce(-sum(amount_cents), 0)::bigint from ledger_entries where kind = 'payout') as "payoutsCents",
             (select coalesce(sum(amount_cents), 0)::bigint from ledger_entries where kind = 'refund') as "refundsCents"
    `),
    rows<{ month: string, gmvCents: number, commissionCents: number, payoutsCents: number, refundsCents: number }>(sql`
      select to_char(m, 'YYYY-MM') as month,
             coalesce((select sum(s.items_cents) from shipments s join orders o on o.id = s.order_id
                        where s.status <> 'cancelled' and date_trunc('month', o.paid_at) = m), 0)::int as "gmvCents",
             coalesce((select -sum(amount_cents) from ledger_entries where kind = 'commission' and date_trunc('month', created_at) = m), 0)::int as "commissionCents",
             coalesce((select -sum(amount_cents) from ledger_entries where kind = 'payout' and date_trunc('month', created_at) = m), 0)::int as "payoutsCents",
             coalesce((select sum(amount_cents) from ledger_entries where kind = 'refund' and date_trunc('month', created_at) = m), 0)::int as "refundsCents"
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      order by m
    `),
    rows<{ userId: string, name: string, email: string, balanceCents: number }>(sql`
      select l.user_id as "userId", u.name, u.email, sum(l.amount_cents)::int as "balanceCents"
      from ledger_entries l join "user" u on u.id = l.user_id
      group by l.user_id, u.name, u.email having sum(l.amount_cents) > 0
      order by 4 desc limit 10
    `),
  ])
  return { totals, monthly, topBalances }
})
