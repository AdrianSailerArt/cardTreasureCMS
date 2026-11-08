import { hashPassword } from 'better-auth/crypto'
import { inArray, sql } from 'drizzle-orm'
import { client, db, schema } from './import/lib/db'
import { chunk, parseArgs } from './import/lib/util'
import { quoteShipping, type PackageItem } from './lib/shipping'

/*
 * Simuliert einen laufenden Marktplatz mit Demo-Daten:
 * Verkäufer (privat/gewerblich), Käufer, Versandarten, Angebote rund um den Richtpreis,
 * Bestellungen der letzten Tage in allen Status, Zahlungen, Bewertungen, Nachrichten und Preisverlauf.
 *
 *   bun run simulate                 Standardumfang (vorhandene Demo-Daten bleiben, neue kommen dazu)
 *   bun run simulate --reset         Demo-Daten löschen und neu simulieren
 *   bun run simulate --clear         nur löschen
 *   bun run simulate --sellers=40 --buyers=120 --products=3000 --orders=800 --days=120 --seed=7
 *
 * Alle Demo-Nutzer haben `is_demo = true` und eine E-Mail unter @demo.cardtreasure.test.
 */

const args = parseArgs()
const num = (key: string, fallback: number) => (args[key] !== undefined ? Number(args[key]) : fallback)
const CFG = {
  sellers: num('sellers', 25),
  buyers: num('buyers', 60),
  products: num('products', 1500),
  orders: num('orders', 400),
  days: num('days', 90),
  seed: num('seed', 42),
}

// ---------- Zufall (reproduzierbar über --seed) ----------
let state = CFG.seed >>> 0
const rand = () => {
  state = (state + 0x6D2B79F5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!
const weighted = <T>(entries: readonly (readonly [T, number])[]): T => {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [v, w] of entries) if ((r -= w) <= 0) return v
  return entries[entries.length - 1]![0]
}
const daysAgo = (d: number, base = new Date()) => new Date(base.getTime() - d * 86_400_000)
const addHours = (date: Date, h: number) => new Date(date.getTime() + h * 3_600_000)
const uuid = () => crypto.randomUUID()

// ---------- Stammdaten ----------
const FIRST = ['Lena', 'Jonas', 'Mia', 'Paul', 'Emma', 'Felix', 'Hannah', 'Lukas', 'Sophie', 'Max', 'Lea', 'Tim', 'Clara', 'Noah', 'Marie', 'Elias', 'Anna', 'Ben', 'Julia', 'Finn', 'Sara', 'Luca', 'Nina', 'David', 'Eva', 'Tom', 'Laura', 'Jan', 'Pia', 'Leon']
const LAST = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Klein', 'Schröder', 'Neumann', 'Braun', 'Zimmermann', 'Hofer', 'de Vries', 'Rossi', 'Dubois', 'García', 'Peeters', 'Jansen']
const SHOPS = ['Kartenkeller', 'Drachenhort', 'Mana Depot', 'Holo Haus', 'Booster Bude', 'Duellanten-Ecke', 'Spielwerk', 'Foil & Friends', 'Trainer Treff', 'Arkanum Games']
const STREETS = ['Hauptstraße', 'Bahnhofstraße', 'Gartenweg', 'Lindenallee', 'Schulstraße', 'Marktplatz', 'Bergstraße', 'Ringstraße']
const CITIES: Record<string, [string, string][]> = {
  DE: [['10115', 'Berlin'], ['80331', 'München'], ['50667', 'Köln'], ['20095', 'Hamburg'], ['04109', 'Leipzig'], ['70173', 'Stuttgart']],
  AT: [['1010', 'Wien'], ['8010', 'Graz']],
  NL: [['1012', 'Amsterdam'], ['3011', 'Rotterdam']],
  FR: [['75001', 'Paris'], ['69001', 'Lyon']],
  IT: [['20121', 'Milano'], ['00184', 'Roma']],
  ES: [['28001', 'Madrid']],
  BE: [['1000', 'Bruxelles']],
}
const COUNTRY_WEIGHTS = [['DE', 60], ['AT', 10], ['NL', 8], ['FR', 7], ['IT', 6], ['ES', 4], ['BE', 5]] as const

type Condition = (typeof schema.cardCondition.enumValues)[number]
type Language = (typeof schema.cardLanguage.enumValues)[number]
type Finish = (typeof schema.cardFinish.enumValues)[number]

const CONDITIONS: readonly (readonly [Condition, number, number])[] = [
  // Zustand, Häufigkeit, Preisfaktor
  ['mint', 5, 1.15], ['near_mint', 45, 1.0], ['excellent', 20, 0.85], ['good', 12, 0.7],
  ['light_played', 10, 0.6], ['played', 6, 0.45], ['poor', 2, 0.25],
]

// ---------- Löschen ----------
const clearDemo = async () => {
  const demoUsers = db.select({ id: schema.user.id }).from(schema.user).where(sql`${schema.user.isDemo}`)
  const demoOrders = db.select({ id: schema.orders.id }).from(schema.orders).where(inArray(schema.orders.buyerId, demoUsers))
  const demoShipments = db.select({ id: schema.shipments.id }).from(schema.shipments).where(inArray(schema.shipments.orderId, demoOrders))

  await db.transaction(async (tx) => {
    await tx.delete(schema.reviews).where(inArray(schema.reviews.shipmentId, demoShipments))
    await tx.delete(schema.conversations).where(inArray(schema.conversations.shipmentId, demoShipments))
    await tx.delete(schema.shipmentItems).where(inArray(schema.shipmentItems.shipmentId, demoShipments))
    await tx.delete(schema.shipments).where(inArray(schema.shipments.orderId, demoOrders))
    await tx.delete(schema.payments).where(inArray(schema.payments.orderId, demoOrders))
    await tx.delete(schema.orders).where(inArray(schema.orders.buyerId, demoUsers))
    await tx.delete(schema.listings).where(inArray(schema.listings.sellerId, demoUsers))
    // Preisverlauf stammt im MVP nur aus der Simulation
    await tx.delete(schema.priceHistory)
    // Rest hängt per ON DELETE CASCADE am Nutzer (Profile, Adressen, Versandarten, Sitzungen …)
    await tx.delete(schema.user).where(sql`${schema.user.isDemo}`)
  })
}

// ---------- Simulation ----------
interface Candidate {
  productId: string
  game: 'mtg' | 'pokemon' | 'yugioh'
  finishes: Finish[]
  languages: Language[]
  hasFirstEdition: boolean
  refCents: number
  currency: string
  refFinish: Finish
}

const loadCandidates = async (): Promise<Candidate[]> => {
  const perGame = Math.ceil(CFG.products / 3)
  // 60 % aus Sets der letzten zwei Jahre (gefragte Ware), 40 % aus dem gesamten Katalog
  const query = (game: string, recent: boolean, limit: number) => sql`
    select pr.id as "productId", g.code as "game", p.finishes::text[] as "finishes", p.languages::text[] as "languages",
           p.has_first_edition as "hasFirstEdition", rp.cents as "refCents", rp.currency, rp.finish as "refFinish"
    from products pr
    join games g on g.id = pr.game_id and g.code = ${game}
    join printings p on p.id = pr.printing_id
    join sets s on s.id = p.set_id
    join lateral (
      select coalesce(r.trend_cents, r.avg_cents, r.low_cents) as cents, r.currency, r.finish
      from reference_prices r
      where r.product_id = pr.id and coalesce(r.trend_cents, r.avg_cents, r.low_cents) between 5 and 300000
      order by (r.finish = p.finishes[1]) desc, r.source
      limit 1
    ) rp on true
    where ${recent ? sql`s.release_date > now() - interval '2 years'` : sql`true`}
    order by md5(pr.id::text || ${String(CFG.seed)})
    limit ${limit}
  `
  const out: Candidate[] = []
  for (const game of ['mtg', 'pokemon', 'yugioh']) {
    const recent = await db.execute(query(game, true, Math.round(perGame * 0.6))) as unknown as Candidate[]
    const any = await db.execute(query(game, false, perGame)) as unknown as Candidate[]
    const seen = new Set(recent.map(c => c.productId))
    out.push(...recent, ...any.filter(c => !seen.has(c.productId)).slice(0, perGame - recent.length))
  }
  return out
}

/*
 * Feste Demo-Konten zum Testen. Anmeldung mit E-Mail + DEMO_PASSWORD, sobald der Passwort-Login
 * in Shop bzw. CMS eingeschaltet ist (NUXT_DEMO_LOGIN=true). Stehen auch in den READMEs.
 */
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_ACCOUNTS = {
  buyer: { id: 'demo_kaeufer', first: 'Karla', last: 'Käuferin', country: 'DE', email: 'kaeufer@demo.cardtreasure.test', username: 'karla_kaeuferin' },
  seller: { id: 'demo_verkaeufer', first: 'Victor', last: 'Verkäufer', country: 'DE', email: 'verkaeufer@demo.cardtreasure.test', username: 'victor_verkaeufer' },
  dealer: { id: 'demo_haendler', first: 'Hanna', last: 'Händlerin', country: 'AT', email: 'haendler@demo.cardtreasure.test', username: 'hanna_haendlerin' },
  admin: { id: 'demo_admin', first: 'Ada', last: 'Admin', country: 'DE', email: 'admin@demo.cardtreasure.test', username: 'ada_admin' },
} as const

/** Legt Passwort-Zugänge (Better-Auth-Konto "credential") für die Demo-Konten an. */
const createDemoLogins = async (accounts: { id: string, first: string, last: string, email: string, username: string }[]) => {
  // Admin ist kein Käufer/Verkäufer und wird deshalb hier angelegt
  await db.insert(schema.user).values({
    id: DEMO_ACCOUNTS.admin.id, name: `${DEMO_ACCOUNTS.admin.first} ${DEMO_ACCOUNTS.admin.last}`,
    email: DEMO_ACCOUNTS.admin.email, emailVerified: true, username: DEMO_ACCOUNTS.admin.username,
    role: 'admin', isDemo: true,
  })
  const hash = await hashPassword(DEMO_PASSWORD)
  await db.insert(schema.account).values(accounts.map(a => ({
    id: crypto.randomUUID(),
    userId: a.id,
    accountId: a.id,
    providerId: 'credential',
    password: hash,
  })))
}

const makePerson = (i: number, prefix: string) => {
  const first = pick(FIRST)
  const last = pick(LAST)
  const country = weighted(COUNTRY_WEIGHTS)
  const slug = `${first}.${last}`.toLowerCase().normalize('NFKD').replace(/[^a-z.]/g, '')
  return {
    id: `demo_${prefix}_${CFG.seed}_${i}`,
    first, last, country,
    email: `${slug}.${prefix}${i}.${CFG.seed}@demo.cardtreasure.test`,
    username: `${slug.replace('.', '_')}_${prefix}${i}`,
  }
}

const simulate = async () => {
  const now = new Date()
  const candidates = await loadCandidates()
  if (!candidates.length) throw new Error('Keine Produkte mit Richtpreis gefunden. Zuerst `bun run import` ausführen.')
  console.log(`Produkte mit Richtpreis: ${candidates.length}`)

  // Nutzer; die ersten Plätze sind feste Demo-Konten mit Passwort (siehe DEMO_ACCOUNTS)
  const sellers = Array.from({ length: CFG.sellers }, (_, i) => ({ ...makePerson(i, 's'), commercial: rand() < 0.3 }))
  const buyers = Array.from({ length: CFG.buyers }, (_, i) => makePerson(i, 'b'))
  sellers[0] = { ...DEMO_ACCOUNTS.seller, commercial: false }
  sellers[1] = { ...DEMO_ACCOUNTS.dealer, commercial: true }
  buyers[0] = DEMO_ACCOUNTS.buyer
  const people = [...sellers, ...buyers]

  await db.insert(schema.user).values(people.map(p => ({
    id: p.id,
    name: `${p.first} ${p.last}`,
    email: p.email,
    emailVerified: true,
    username: p.username,
    locale: p.country === 'DE' || p.country === 'AT' ? 'de' as const : 'en' as const,
    isDemo: true,
    createdAt: daysAgo(int(CFG.days, 400)).toISOString(),
  })))

  await createDemoLogins([...Object.values(DEMO_ACCOUNTS)])

  const addressRows = people.map((p) => {
    const [postalCode, city] = pick(CITIES[p.country]!)
    return {
      id: uuid(), userId: p.id, name: `${p.first} ${p.last}`, street: pick(STREETS), houseNumber: String(int(1, 120)),
      postalCode, city, country: p.country, isDefault: true,
    }
  })
  await db.insert(schema.addresses).values(addressRows)
  const addressOf = new Map(addressRows.map(a => [a.userId, a]))

  await db.insert(schema.sellerProfiles).values(sellers.map((s, i) => ({
    userId: s.id,
    type: s.commercial ? 'commercial' as const : 'private' as const,
    displayName: s.commercial ? `${SHOPS[i % SHOPS.length]} ${s.last}` : s.username,
    country: s.country,
    shipFromAddressId: addressOf.get(s.id)!.id,
    companyName: s.commercial ? `${SHOPS[i % SHOPS.length]} GmbH` : null,
    vatId: s.commercial ? `${s.country}${int(100000000, 999999999)}` : null,
    stripeAccountId: `acct_demo_${s.id}`,
    payoutsEnabled: true,
    createdAt: daysAgo(int(CFG.days, 300)).toISOString(),
  })))

  // Angebote
  type ListingRow = typeof schema.listings.$inferInsert & { id: string, quantity: number, priceCents: number }
  const listings: ListingRow[] = []
  for (const c of candidates) {
    const offers = weighted([[1, 30], [2, 30], [3, 20], [4, 12], [6, 8]] as const)
    for (let k = 0; k < offers; k++) {
      const seller = pick(sellers)
      const [condition, , factor] = weighted(CONDITIONS.map(x => [x, x[1]] as const))
      const finish = c.finishes.length ? pick(c.finishes) : 'normal'
      const langs = c.languages.length ? c.languages : ['en' as Language]
      const language = langs.includes('de') && rand() < 0.4 ? 'de' : pick(langs)
      const usd = c.currency === 'USD' ? 0.92 : 1
      const finishFactor = finish === c.refFinish ? 1 : finish === 'normal' ? 0.6 : 1.4
      const seller_ = seller.commercial ? 1.05 : 0.95
      const price = Math.max(10, Math.round(c.refCents * usd * factor * finishFactor * seller_ * (0.85 + rand() * 0.4)))
      const cheap = price < 200
      listings.push({
        id: uuid(),
        sellerId: seller.id,
        productId: c.productId,
        condition,
        language,
        finish,
        isFirstEdition: c.hasFirstEdition && rand() < 0.2,
        quantity: cheap ? int(1, 8) : weighted([[1, 70], [2, 20], [3, 10]] as const),
        priceCents: price,
        createdAt: daysAgo(CFG.days + int(0, 30)).toISOString(),
        comment: rand() < 0.08 ? pick(['Direkt aus dem Booster in die Hülle.', 'Kleiner Knick an der Ecke, siehe Foto.', 'Aus Sammlungsauflösung.', 'Versand im Toploader.']) : null,
      })
    }
  }
  for (const part of chunk(listings, 1000)) await db.insert(schema.listings).values(part)
  console.log(`Angebote: ${listings.length} von ${sellers.length} Verkäufern`)

  // Bestellungen
  const bySeller = new Map<string, ListingRow[]>()
  for (const l of listings) bySeller.set(l.sellerId, [...(bySeller.get(l.sellerId) ?? []), l])
  const stock = new Map(listings.map(l => [l.id, l.quantity]))
  const sellerCountry = new Map(sellers.map(s => [s.id, s.country as string]))

  const orderRows: (typeof schema.orders.$inferInsert)[] = []
  const shipmentRows: (typeof schema.shipments.$inferInsert)[] = []
  const itemRows: (typeof schema.shipmentItems.$inferInsert)[] = []
  const paymentRows: (typeof schema.payments.$inferInsert)[] = []
  const reviewRows: (typeof schema.reviews.$inferInsert)[] = []
  const conversationRows: (typeof schema.conversations.$inferInsert)[] = []
  const participantRows: (typeof schema.conversationParticipants.$inferInsert)[] = []
  const messageRows: (typeof schema.messages.$inferInsert)[] = []

  for (let o = 0; o < CFG.orders; o++) {
    // Mehr Bestellungen in jüngerer Zeit (wachsender Marktplatz)
    const age = CFG.days * (1 - Math.sqrt(rand()))
    const createdAt = daysAgo(age, now)
    // Demo-Käuferin bekommt öfter Bestellungen, damit ihr Konto gefüllt ist
    const buyer = rand() < 0.08 ? buyers[0]! : rand() < 0.85 ? pick(buyers) : pick(sellers)
    const buyerAddress = addressOf.get(buyer.id)!
    const orderId = uuid()

    const sellerIds = [...new Set(Array.from({ length: weighted([[1, 70], [2, 22], [3, 8]] as const) }, () => pick(sellers).id))]
      .filter(id => id !== buyer.id)
    let orderItems = 0
    let orderShipping = 0
    const orderShipments: string[] = []

    for (const sellerId of sellerIds) {
      const available = (bySeller.get(sellerId) ?? []).filter(l => (stock.get(l.id) ?? 0) > 0)
      if (!available.length) continue
      const count = Math.min(available.length, weighted([[1, 35], [2, 25], [3, 15], [5, 15], [8, 10]] as const))
      const chosen = new Set<ListingRow>()
      while (chosen.size < count) chosen.add(pick(available))

      const shipmentId = uuid()
      let items = 0
      const packageItems: PackageItem[] = []
      for (const l of chosen) {
        const qty = Math.min(stock.get(l.id)!, weighted([[1, 80], [2, 15], [4, 5]] as const))
        stock.set(l.id, stock.get(l.id)! - qty)
        items += qty * l.priceCents
        packageItems.push({ kind: 'single', quantity: qty, unitPriceCents: l.priceCents })
        itemRows.push({
          id: uuid(), shipmentId, listingId: l.id, productId: l.productId, condition: l.condition, language: l.language!,
          finish: l.finish!, isFirstEdition: l.isFirstEdition ?? false, quantity: qty, unitPriceCents: l.priceCents,
        })
      }

      // Versand automatisch aus dem Plattform-Tarif: Gewicht, Dicke (inkl. Schutz und Puffer), Wert, Herkunft, Ziel
      const quote = quoteShipping(packageItems, sellerCountry.get(sellerId)!, buyerAddress.country)
      if (!quote) continue

      // Status nach Alter der Bestellung
      const roll = rand()
      const status = age < 0.3 && roll < 0.4
        ? 'awaiting_payment' as const
        : age < 2 ? 'paid' as const
          : age < 5 ? (roll < 0.7 ? 'shipped' as const : 'paid' as const)
            : age < 10 ? (roll < 0.5 ? 'delivered' as const : roll < 0.9 ? 'completed' as const : 'shipped' as const)
              : roll < 0.03 ? 'cancelled' as const : roll < 0.05 ? 'disputed' as const : 'completed' as const

      const paidAt = status === 'awaiting_payment' ? null : addHours(createdAt, rand() * 2)
      const shippedAt = ['shipped', 'delivered', 'completed', 'disputed'].includes(status) ? addHours(paidAt!, int(12, 72)) : null
      const deliveredAt = ['delivered', 'completed', 'disputed'].includes(status) ? addHours(shippedAt!, int(24, 96)) : null
      const completedAt = status === 'completed' ? addHours(deliveredAt!, int(1, 72)) : null

      shipmentRows.push({
        id: shipmentId,
        orderId,
        sellerId,
        status,
        itemsCents: items,
        shippingCents: quote.priceCents,
        shippingService: quote.service,
        shippingFormat: quote.format,
        packageWeightG: quote.weightG,
        commissionCents: Math.round(items * 0.05),
        carrier: quote.format === 'parcel' ? 'dhl' : 'deutsche_post',
        trackingNumber: quote.tracked && shippedAt ? `${quote.format === 'parcel' ? '00340' : 'RR'}${int(100000000, 999999999)}DE` : null,
        stripeTransferId: completedAt ? `tr_demo_${shipmentId.slice(0, 8)}` : null,
        shippedAt: shippedAt?.toISOString(),
        deliveredAt: deliveredAt?.toISOString(),
        completedAt: completedAt?.toISOString(),
        cancelledAt: status === 'cancelled' ? addHours(createdAt, int(24, 120)).toISOString() : null,
      })
      orderShipments.push(shipmentId)
      orderItems += items
      orderShipping += quote.priceCents

      // Bewertungen für abgeschlossene Sendungen
      if (completedAt && rand() < 0.7) {
        const r = weighted([[5, 78], [4, 14], [3, 5], [2, 2], [1, 1]] as const)
        reviewRows.push({
          id: uuid(), shipmentId, direction: 'buyer_to_seller', authorId: buyer.id, subjectId: sellerId,
          ratingOverall: r, ratingDescription: Math.min(5, r + int(0, 1)), ratingPackaging: Math.min(5, r + int(0, 1)),
          comment: r >= 4 ? pick(['Schneller Versand, super verpackt!', 'Alles wie beschrieben, gerne wieder.', 'Top Verkäufer.', null]) : pick(['Zustand etwas schlechter als angegeben.', 'Versand hat lange gedauert.']),
          createdAt: addHours(completedAt, int(1, 48)).toISOString(),
        })
      }
      if (completedAt && rand() < 0.3) {
        reviewRows.push({
          id: uuid(), shipmentId, direction: 'seller_to_buyer', authorId: sellerId, subjectId: buyer.id,
          ratingOverall: weighted([[5, 90], [4, 8], [3, 2]] as const), comment: null,
          createdAt: addHours(completedAt, int(1, 72)).toISOString(),
        })
      }

      // Gelegentlich Nachrichten zur Sendung
      if (paidAt && rand() < 0.15) {
        const conversationId = uuid()
        const t0 = addHours(paidAt, int(1, 20))
        conversationRows.push({ id: conversationId, shipmentId, createdAt: t0.toISOString(), lastMessageAt: addHours(t0, 3).toISOString() })
        participantRows.push({ conversationId, userId: buyer.id }, { conversationId, userId: sellerId, lastReadAt: addHours(t0, 3).toISOString() })
        messageRows.push(
          { id: uuid(), conversationId, senderId: buyer.id, body: pick(['Hallo! Könnten Sie die Karten bitte im Toploader verschicken?', 'Hi, gibt es eine Sendungsnummer?', 'Kann ich noch eine Karte dazubestellen und Versand sparen?']), createdAt: t0.toISOString() },
          { id: uuid(), conversationId, senderId: sellerId, body: pick(['Klar, mache ich gerne!', 'Ist unterwegs, Nummer steht in der Bestellung.', 'Gerne, legen Sie sie einfach in den Warenkorb.']), createdAt: addHours(t0, 3).toISOString() },
        )
      }
    }

    if (!orderShipments.length) continue
    const anyPaid = shipmentRows.some(s => s.orderId === orderId && s.status !== 'awaiting_payment')
    const allCancelled = shipmentRows.filter(s => s.orderId === orderId).every(s => s.status === 'cancelled')
    const date = createdAt.toISOString().slice(0, 10).replaceAll('-', '')
    orderRows.push({
      id: orderId,
      number: `CT-${date}-${String(o + 1).padStart(5, '0')}-${CFG.seed}`,
      buyerId: buyer.id,
      status: allCancelled ? 'cancelled' : anyPaid ? 'paid' : 'pending_payment',
      shippingAddress: {
        name: buyerAddress.name, street: buyerAddress.street, houseNumber: buyerAddress.houseNumber,
        postalCode: buyerAddress.postalCode, city: buyerAddress.city, country: buyerAddress.country,
      },
      itemsCents: orderItems,
      shippingCents: orderShipping,
      totalCents: orderItems + orderShipping,
      createdAt: createdAt.toISOString(),
      paidAt: anyPaid ? addHours(createdAt, 1).toISOString() : null,
    })
    paymentRows.push({
      id: uuid(), orderId, provider: 'stripe', providerRef: `pi_demo_${orderId.replaceAll('-', '').slice(0, 20)}`,
      amountCents: orderItems + orderShipping, status: anyPaid ? 'succeeded' : 'pending', createdAt: createdAt.toISOString(),
    })
  }

  // Schreiben (Reihenfolge wegen Fremdschlüsseln)
  for (const part of chunk(orderRows, 500)) await db.insert(schema.orders).values(part)
  for (const part of chunk(shipmentRows, 500)) await db.insert(schema.shipments).values(part)
  for (const part of chunk(itemRows, 1000)) await db.insert(schema.shipmentItems).values(part)
  for (const part of chunk(paymentRows, 500)) await db.insert(schema.payments).values(part)
  for (const part of chunk(reviewRows, 500)) if (part.length) await db.insert(schema.reviews).values(part)
  if (conversationRows.length) {
    await db.insert(schema.conversations).values(conversationRows)
    await db.insert(schema.conversationParticipants).values(participantRows)
    await db.insert(schema.messages).values(messageRows)
  }

  // Verkaufte Mengen von den Angeboten abziehen (offene, bezahlte und abgeschlossene Bestellungen)
  const sold = [...stock.entries()].filter(([id, q]) => q !== listings.find(l => l.id === id)!.quantity)
  for (const part of chunk(sold, 500)) {
    await db.execute(sql`
      update listings as l set
        quantity = v.q,
        status = case when v.q = 0 then 'sold_out'::listing_status else l.status end,
        updated_at = now()
      from (values ${sql.join(part.map(([id, q]) => sql`(${id}::uuid, ${q}::int)`), sql`, `)}) as v(id, q)
      where l.id = v.id
    `)
  }

  await rebuildPriceHistory()

  console.log(`Bestellungen: ${orderRows.length}, Sendungen: ${shipmentRows.length}, Positionen: ${itemRows.length}`)
  console.log(`Bewertungen: ${reviewRows.length}, Unterhaltungen: ${conversationRows.length}`)
}

/** Täglicher Preisverlauf aus den simulierten Verkäufen, Trend = gleitender 7-Tage-Durchschnitt. */
const rebuildPriceHistory = async () => {
  await db.delete(schema.priceHistory)
  await db.execute(sql`
    insert into price_history (product_id, finish, day, low_cents, avg_sold_cents, sold_count, listing_count, trend_cents)
    with daily as (
      select si.product_id, si.finish, (o.paid_at at time zone 'Europe/Berlin')::date as day,
             min(si.unit_price_cents) as low_cents,
             round(sum(si.unit_price_cents * si.quantity)::numeric / sum(si.quantity))::int as avg_sold_cents,
             sum(si.quantity)::int as sold_count
      from shipment_items si
      join shipments s on s.id = si.shipment_id and s.status <> 'cancelled'
      join orders o on o.id = s.order_id and o.paid_at is not null
      group by 1, 2, 3
    )
    select d.product_id, d.finish, d.day, d.low_cents, d.avg_sold_cents, d.sold_count,
           (select count(*)::int from listings l where l.product_id = d.product_id and l.finish = d.finish and l.status = 'active'),
           round(avg(d.avg_sold_cents) over (partition by d.product_id, d.finish order by d.day
                                              range between interval '6 days' preceding and current row))::int
    from daily d
  `)
}

try {
  if (args.clear || args.reset) {
    await clearDemo()
    console.log('Demo-Daten gelöscht')
  }
  if (!args.clear) {
    const started = Date.now()
    await simulate()
    console.log(`Fertig in ${Math.round((Date.now() - started) / 1000)} s`)
  }
}
finally {
  await client.end()
}
