import { hashPassword } from 'better-auth/crypto'
import { sql } from 'drizzle-orm'
import { isLocalDatabase } from '@cardtreasure/core/db'
import { TEST_ACCOUNTS, TEST_EMAIL_DOMAIN, TEST_PASSWORD, type TestAccount } from '@cardtreasure/core/test-accounts'
import { client, db } from './import/lib/db'

/*
 * Saubere Testdaten für lokal (und danach per Kopie für Staging): nur der Katalog bleibt, dazu wenige feste Testkonten.
 *
 *   bun run testdata --reset     ALLE Marktplatzdaten löschen (Konten, Angebote, Bestellungen, Zahlungen, Guthaben,
 *                                Nachrichten, Bewertungen, Benachrichtigungen …) und die Testkonten neu anlegen.
 *                                Bleibt: Katalog, Preise, Sealed, Blog, Provisions- und Werberegeln, Plattform-Konto.
 *   bun run testdata             Testkonten anlegen, falls sie fehlen (nichts wird gelöscht)
 *   bun run testdata add <email> "<Name>" [--seller=private|commercial] [--country=DE] [--admin]
 *                                weiteres Testkonto mit demselben Passwort (E-Mail unter @test.cardtreasure.test)
 *
 * Danach nach Staging: im Shop bun run db:copy:staging -- --replace
 * Stripe: keine Stripe-Daten. Käufer zahlen mit Testkarten, Verkäufer richten die Auszahlung im Testmodus selbst ein.
 * Nur gegen eine lokale Datenbank; andere Ziele mit --allow-remote.
 */

const argv = process.argv.slice(2)
const flag = (name: string) => argv.includes(`--${name}`)
const option = (name: string) => argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
const PLATFORM_ID = 'cardtreasure'
const LISTINGS_PER_SELLER = 9

const target = process.env.NUXT_DATABASE_URL!
if (!isLocalDatabase(target) && !flag('allow-remote')) {
  console.error('Ziel ist keine lokale Datenbank. Für Staging lokal vorbereiten und mit db:copy:staging -- --replace kopieren (oder --allow-remote).')
  process.exit(1)
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Alle Marktplatzdaten löschen; Konten außer Plattform und Test-Admin (Autor von Blog/Sealed) gehen per Kaskade mit. */
const wipe = async (tx: Tx) => {
  // Benutzernamen der Testkonten freigeben (alte Demo-Konten mit gleichen Namen werden gleich gelöscht)
  await tx.execute(sql`update "user" set username = null where username in (${sql.join(TEST_ACCOUNTS.map(a => sql`${a.username}`), sql`, `)})
    and id not in (${sql.join(TEST_ACCOUNTS.map(a => sql`${a.id}`), sql`, `)})`)
  // Blog-Beiträge und Sealed-Produkte gehören dem Test-Admin, damit ihre Autoren gelöscht werden können
  await ensureUser(tx, TEST_ACCOUNTS.find(a => a.role === 'admin')!)
  await tx.execute(sql`update posts set author_id = 'test_admin' where author_id not in ('test_admin', ${PLATFORM_ID})`)
  await tx.execute(sql`update sealed_products set created_by = 'test_admin' where created_by is not null and created_by not in ('test_admin', ${PLATFORM_ID})`)
  // Reihenfolge wegen Fremdschlüsseln ohne Kaskade
  for (const table of ['reviews', 'conversations', 'payment_refunds', 'ledger_entries', 'shipment_items', 'shipments', 'payments', 'orders',
    'cart_items', 'ad_clicks', 'listings', 'price_history', 'commission_overrides', 'reports', 'moderation_log', 'verification']) {
    await tx.execute(sql.raw(`delete from ${table}`))
  }
  // Fotos von Angeboten (die Angebote sind weg); Ersatz-Kartenbilder der Admins bleiben (Dateien im Speicher bleiben liegen)
  await tx.execute(sql`delete from media where purpose = 'listing_photo'`)
  await tx.execute(sql`update media set owner_id = 'test_admin' where owner_id is not null and owner_id not in ('test_admin', ${PLATFORM_ID})`)
  // Test-Admin bleibt (Autor), seine Zugänge und Adressen werden neu angelegt
  await tx.execute(sql`delete from "user" where id not in (${PLATFORM_ID}, 'test_admin')`)
  await tx.execute(sql`delete from account where user_id = 'test_admin'`)
  await tx.execute(sql`delete from addresses where user_id = 'test_admin'`)
  await tx.execute(sql`delete from session where user_id = 'test_admin'`)
}

const ensureUser = async (tx: Tx, a: Pick<TestAccount, 'id' | 'email' | 'name' | 'username' | 'locale' | 'role'>) => {
  await tx.execute(sql`
    insert into "user" (id, name, email, email_verified, username, locale, role, is_demo)
    values (${a.id}, ${a.name}, ${a.email}, true, ${a.username}, ${a.locale}, ${a.role === 'admin' ? 'admin' : 'user'}, true)
    on conflict (id) do nothing
  `)
}

/** Konto mit Adresse, Passwort und (für Verkäufer) Verkäuferprofil; vorhandene Konten bleiben unverändert. */
const createAccount = async (tx: Tx, a: TestAccount, hash: string) => {
  const [exists] = await tx.execute(sql`select 1 from account where user_id = ${a.id} and provider_id = 'credential'`) as unknown as unknown[]
  await ensureUser(tx, a)
  if (exists) return false
  await tx.execute(sql`insert into account (id, user_id, account_id, provider_id, password, created_at, updated_at)
    values (${crypto.randomUUID()}, ${a.id}, ${a.id}, 'credential', ${hash}, now(), now())`)
  const [addr] = await tx.execute(sql`
    insert into addresses (user_id, name, street, house_number, postal_code, city, country, is_default)
    values (${a.id}, ${a.company?.name ?? a.name}, ${a.address.street}, ${a.address.houseNumber}, ${a.address.postalCode}, ${a.address.city}, ${a.country}, true)
    returning id
  `) as unknown as { id: string }[]
  if (a.role === 'seller' || a.role === 'dealer') {
    await tx.execute(sql`
      insert into seller_profiles (user_id, type, display_name, country, ship_from_address_id, company_name, vat_id)
      values (${a.id}, ${a.role === 'dealer' ? 'commercial' : 'private'}, ${a.company?.displayName ?? a.username}, ${a.country}, ${addr!.id},
              ${a.company?.name ?? null}, ${a.company?.vatId ?? null})
    `)
  }
  return true
}

/** Ein paar Angebote je Verkäufer (je Spiel drei Karten mit Richtpreis 0,50–25 €, Dollar umgerechnet), damit es etwas zu kaufen gibt. */
const createListings = async (tx: Tx, sellerId: string, commercial: boolean, seed: string) => {
  await tx.execute(sql`
    insert into listings (seller_id, product_id, condition, language, finish, quantity, price_cents, storage_location)
    select ${sellerId}, x.product_id, 'near_mint', 'en', 'normal', x.qty, x.price, x.storage
    from (
      select pr.id as product_id, g.code,
             greatest(10, round(rp.cents * ${commercial ? 1.05 : 0.95}::numeric))::int as price,
             1 + (abs(hashtext(pr.id::text || ${seed})) % 4) as qty,
             ${commercial ? sql`'Regal ' || chr(65 + abs(hashtext(pr.id::text)) % 4) || ', Fach ' || (1 + abs(hashtext(pr.id::text || 'f')) % 20)` : sql`null`} as storage,
             row_number() over (partition by g.code order by hashtext(pr.id::text || ${seed})) as n
      from products pr
      join games g on g.id = pr.game_id
      join printings p on p.id = pr.printing_id
      join lateral (select round(coalesce(r.trend_cents, r.avg_cents) * case when r.currency = 'USD' then 0.92 else 1 end) as cents
                    from reference_prices r where r.product_id = pr.id and r.finish = 'normal'
                    order by (r.currency = 'EUR') desc limit 1) rp on true
      where pr.kind = 'single' and 'normal' = any(p.finishes::text[]) and 'en' = any(p.languages::text[])
        and rp.cents between 50 and 2500
    ) x
    where x.n <= ${LISTINGS_PER_SELLER / 3}::int
  `)
}

const reset = async () => {
  const hash = await hashPassword(TEST_PASSWORD)
  await db.transaction(async (tx) => {
    await wipe(tx)
    for (const a of TEST_ACCOUNTS) await createAccount(tx, a, hash)
    for (const a of TEST_ACCOUNTS.filter(x => x.role === 'seller' || x.role === 'dealer')) await createListings(tx, a.id, a.role === 'dealer', a.id)
  })
}

const ensure = async () => {
  const hash = await hashPassword(TEST_PASSWORD)
  await db.transaction(async (tx) => {
    for (const a of TEST_ACCOUNTS) {
      if (await createAccount(tx, a, hash) && a.role !== 'buyer' && a.role !== 'admin') await createListings(tx, a.id, a.role === 'dealer', a.id)
    }
  })
}

const add = async () => {
  const [email, name] = argv.slice(1).filter(a => !a.startsWith('--'))
  if (!email || !name) throw new Error('Aufruf: bun run testdata add <email> "<Name>" [--seller=private|commercial] [--country=DE] [--admin]')
  const mail = email.includes('@') ? email : `${email}@${TEST_EMAIL_DOMAIN}`
  if (!mail.endsWith(`@${TEST_EMAIL_DOMAIN}`)) throw new Error(`Testkonten nur unter @${TEST_EMAIL_DOMAIN} (sonst würden Mails echte Adressen erreichen)`)
  const seller = option('seller')
  const country = (option('country') ?? 'DE').toUpperCase()
  const local = mail.split('@')[0]!
  const account: TestAccount = {
    id: `test_${local.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`, email: mail, name, username: local.replace(/[^a-z0-9]+/gi, '_').toLowerCase(),
    role: flag('admin') ? 'admin' : seller === 'commercial' ? 'dealer' : seller === 'private' ? 'seller' : 'buyer',
    country, locale: country === 'DE' || country === 'AT' ? 'de' : 'en',
    address: { street: 'Teststraße', houseNumber: '1', postalCode: '10115', city: 'Berlin' },
    ...(seller === 'commercial' ? { company: { name: `${name} GmbH`, vatId: `${country}123456789`, displayName: name } } : {}),
  }
  const hash = await hashPassword(TEST_PASSWORD)
  const created = await db.transaction(async tx => await createAccount(tx, account, hash))
  console.log(created ? `Angelegt: ${mail} (${account.role}), Passwort ${TEST_PASSWORD}` : `${mail} gibt es schon`)
}

const summary = async () => {
  const rows = await db.execute(sql`
    select u.email, u.role, sp.type::text as seller, (select count(*)::int from listings l where l.seller_id = u.id) as listings
    from "user" u left join seller_profiles sp on sp.user_id = u.id where u.id <> ${PLATFORM_ID} order by u.email
  `) as unknown as { email: string, role: string, seller: string | null, listings: number }[]
  console.log(`\nTestkonten (Passwort ${TEST_PASSWORD}):`)
  for (const r of rows) console.log(`  ${r.email.padEnd(36)} ${r.role === 'admin' ? 'Admin (CMS)' : r.seller === 'commercial' ? 'gewerblich' : r.seller === 'private' ? 'privat, verkauft' : 'kauft'}${r.listings ? `, ${r.listings} Angebote` : ''}`)
}

try {
  if (argv[0] === 'add') await add()
  else if (flag('reset')) {
    await reset()
    console.log('Marktplatzdaten gelöscht, Testkonten neu angelegt.')
  }
  else await ensure()
  await summary()
}
finally {
  await client.end()
}
