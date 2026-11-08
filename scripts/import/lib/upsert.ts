import { and, eq, inArray, sql } from 'drizzle-orm'
import { db, schema, type CardFinish, type CardLanguage, type GameCode } from './db'
import { chunk } from './util'

const { games, sets, cards, cardTranslations, printings, products, referencePrices } = schema

/*
 * Gemeinsames Zwischenformat. Jeder Importer bildet seine API darauf ab,
 * der Rest (Upsert, Produkte, Preise) ist für alle Spiele gleich.
 */

export interface NormSet {
  externalId: string
  code: string
  name: string
  names?: Partial<Record<string, string>>
  setType?: string | null
  series?: string | null
  releaseDate?: string | null
  cardCount?: number | null
  iconUrl?: string | null
  logoUrl?: string | null
  parentExternalId?: string | null
  attributes?: Record<string, unknown>
}

export interface NormCard {
  externalId: string
  slug: string
  name: string
  typeLine?: string | null
  attributes: Record<string, unknown>
  translations: { language: CardLanguage, name: string, text?: string | null }[]
}

export interface NormPrice {
  source: 'cardmarket' | 'tcgplayer'
  finish: CardFinish
  currency: string
  lowCents?: number | null
  avgCents?: number | null
  trendCents?: number | null
}

export interface NormPrinting {
  cardExternalId: string
  setExternalId: string
  externalId: string
  collectorNumber?: string | null
  rarity?: string | null
  finishes: CardFinish[]
  languages: CardLanguage[]
  hasFirstEdition?: boolean
  artist?: string | null
  sourceImageUrl?: string | null
  externalRefs?: Record<string, string | number>
  attributes?: Record<string, unknown>
  productSlug: string
  productName: string
  prices?: NormPrice[]
  /**
   * Nur Sprachen und Varianten ergänzen, die übrigen Felder eines bestehenden Drucks bleiben.
   * Für Scryfall: Nicht-englische Objekte desselben Drucks sollen das englische nicht überschreiben.
   */
  mergeOnly?: boolean
}

export async function ensureGame(code: GameCode, name: string): Promise<number> {
  const [row] = await db.insert(games).values({ code, name })
    .onConflictDoUpdate({ target: games.code, set: { name } })
    .returning({ id: games.id })
  return row!.id
}

/** Legt Sets an oder aktualisiert sie. Gibt externalId → interne ID zurück. */
export async function upsertSets(gameId: number, list: NormSet[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const part of chunk(list, 500)) {
    const rows = await db.insert(sets).values(part.map(s => ({
      gameId,
      externalId: s.externalId,
      code: s.code,
      name: s.name,
      names: s.names ?? {},
      setType: s.setType ?? null,
      series: s.series ?? null,
      releaseDate: s.releaseDate ?? null,
      cardCount: s.cardCount ?? null,
      iconUrl: s.iconUrl ?? null,
      logoUrl: s.logoUrl ?? null,
      attributes: s.attributes ?? {},
    }))).onConflictDoUpdate({
      target: [sets.gameId, sets.externalId],
      set: {
        code: sql`excluded.code`,
        name: sql`excluded.name`,
        names: sql`"sets"."names" || excluded.names`,
        setType: sql`excluded.set_type`,
        series: sql`excluded.series`,
        releaseDate: sql`excluded.release_date`,
        cardCount: sql`excluded.card_count`,
        iconUrl: sql`excluded.icon_url`,
        logoUrl: sql`excluded.logo_url`,
        attributes: sql`excluded.attributes`,
        updatedAt: sql`now()`,
      },
    }).returning({ id: sets.id, externalId: sets.externalId })
    for (const r of rows) map.set(r.externalId, r.id)
  }

  // Eltern-Sets (z.B. Promo- oder Token-Sets bei Magic) im zweiten Durchgang verknüpfen
  for (const s of list) {
    if (!s.parentExternalId) continue
    const parentId = map.get(s.parentExternalId)
    const id = map.get(s.externalId)
    if (parentId && id) await db.update(sets).set({ parentSetId: parentId }).where(eq(sets.id, id))
  }
  return map
}

export async function loadSetMap(gameId: number): Promise<Map<string, string>> {
  const rows = await db.select({ id: sets.id, externalId: sets.externalId }).from(sets).where(eq(sets.gameId, gameId))
  return new Map(rows.map(r => [r.externalId, r.id]))
}

const union = (col: string) =>
  sql.raw(`(select coalesce(array_agg(distinct x), '{}') from unnest("printings"."${col}" || excluded."${col}") as x)`)

export interface BatchResult { cards: number, printings: number, skipped: number }

/** Schreibt einen Stapel Karten und Drucke inklusive Produkten und Referenzpreisen. */
export async function upsertBatch(
  game: GameCode,
  gameId: number,
  setMap: Map<string, string>,
  cardList: NormCard[],
  printingList: NormPrinting[],
): Promise<BatchResult> {
  // 1. Karten (innerhalb des Stapels zusammenführen, sonst meldet Postgres doppelte Konflikte)
  const cardMap = new Map<string, NormCard>()
  for (const c of cardList) {
    const prev = cardMap.get(c.externalId)
    if (!prev) { cardMap.set(c.externalId, { ...c, translations: [...c.translations] }); continue }
    for (const t of c.translations) {
      const i = prev.translations.findIndex(x => x.language === t.language)
      if (i < 0) prev.translations.push(t)
      else if (!prev.translations[i]!.text && t.text) prev.translations[i] = t
    }
  }

  const cardIds = new Map<string, string>()
  for (const part of chunk([...cardMap.values()], 1000)) {
    const rows = await db.insert(cards).values(part.map(c => ({
      gameId, externalId: c.externalId, slug: c.slug, name: c.name, typeLine: c.typeLine ?? null, attributes: c.attributes,
    }))).onConflictDoUpdate({
      target: [cards.gameId, cards.externalId],
      set: {
        name: sql`excluded.name`,
        typeLine: sql`excluded.type_line`,
        attributes: sql`excluded.attributes`,
        updatedAt: sql`now()`,
      },
    }).returning({ id: cards.id, externalId: cards.externalId })
    for (const r of rows) cardIds.set(r.externalId, r.id)
  }

  // 2. Übersetzungen
  const translations = [...cardMap.values()].flatMap(c =>
    c.translations.map(t => ({ cardId: cardIds.get(c.externalId)!, language: t.language, name: t.name, text: t.text ?? null })))
  for (const part of chunk(translations, 2000)) {
    await db.insert(cardTranslations).values(part).onConflictDoUpdate({
      target: [cardTranslations.cardId, cardTranslations.language],
      set: { name: sql`excluded.name`, text: sql`coalesce(excluded.text, "card_translations"."text")` },
    })
  }

  // 3. Drucke
  let skipped = 0
  const printMap = new Map<string, NormPrinting & { setId: string, cardId: string }>()
  for (const p of printingList) {
    const setId = setMap.get(p.setExternalId)
    const cardId = cardIds.get(p.cardExternalId)
    if (!setId || !cardId) { skipped++; continue }
    const key = `${setId}|${p.externalId}`
    const prev = printMap.get(key)
    if (!prev) { printMap.set(key, { ...p, setId, cardId }); continue }
    const merged = prev.mergeOnly && !p.mergeOnly ? { ...p, setId, cardId } : prev
    const other = merged === prev ? p : prev
    merged.languages = [...new Set([...merged.languages, ...other.languages])]
    merged.finishes = [...new Set([...merged.finishes, ...other.finishes])]
    merged.mergeOnly = prev.mergeOnly && p.mergeOnly
    printMap.set(key, merged)
  }

  const all = [...printMap.values()]
  const printingIds = new Map<string, string>()
  for (const mergeOnly of [false, true]) {
    for (const part of chunk(all.filter(p => !!p.mergeOnly === mergeOnly), 800)) {
      const rows = await db.insert(printings).values(part.map(p => ({
        cardId: p.cardId,
        setId: p.setId,
        externalId: p.externalId,
        collectorNumber: p.collectorNumber ?? null,
        rarity: p.rarity ?? null,
        finishes: p.finishes,
        languages: p.languages,
        hasFirstEdition: p.hasFirstEdition ?? false,
        artist: p.artist ?? null,
        sourceImageUrl: p.sourceImageUrl ?? null,
        externalRefs: p.externalRefs ?? {},
        attributes: p.attributes ?? {},
      }))).onConflictDoUpdate({
        target: [printings.setId, printings.externalId],
        set: mergeOnly
          ? {
              languages: union('languages'),
              finishes: union('finishes'),
              updatedAt: sql`now()`,
            }
          : {
              cardId: sql`excluded.card_id`,
              collectorNumber: sql`excluded.collector_number`,
              rarity: sql`excluded.rarity`,
              languages: union('languages'),
              finishes: union('finishes'),
              hasFirstEdition: sql`"printings"."has_first_edition" or excluded.has_first_edition`,
              artist: sql`coalesce(excluded.artist, "printings"."artist")`,
              sourceImageUrl: sql`coalesce(excluded.source_image_url, "printings"."source_image_url")`,
              externalRefs: sql`"printings"."external_refs" || excluded.external_refs`,
              attributes: sql`excluded.attributes`,
              updatedAt: sql`now()`,
            },
      }).returning({ id: printings.id, setId: printings.setId, externalId: printings.externalId })
      for (const r of rows) printingIds.set(`${r.setId}|${r.externalId}`, r.id)
    }
  }

  // 4. Produkte (eins pro Druck). Slugs, die schon ein anderer Druck belegt, bekommen einen Zusatz.
  const productRows = all.map(p => ({
    printingId: printingIds.get(`${p.setId}|${p.externalId}`)!,
    slug: p.productSlug,
    name: p.productName,
  }))
  const taken = new Map<string, string | null>()
  for (const part of chunk(productRows.map(r => r.slug), 2000)) {
    const rows = await db.select({ slug: products.slug, printingId: products.printingId })
      .from(products).where(inArray(products.slug, part))
    for (const r of rows) taken.set(r.slug, r.printingId)
  }
  for (const r of productRows) {
    const owner = taken.get(r.slug)
    if (owner !== undefined && owner !== r.printingId) r.slug = `${r.slug}-${r.printingId.slice(0, 6)}`
    taken.set(r.slug, r.printingId)
  }

  const productIds = new Map<string, string>()
  for (const part of chunk(productRows, 2000)) {
    const rows = await db.insert(products).values(part.map(r => ({
      gameId, kind: 'single' as const, printingId: r.printingId, slug: r.slug, name: r.name,
    }))).onConflictDoUpdate({
      target: products.printingId,
      set: { name: sql`excluded.name` },
    }).returning({ id: products.id, printingId: products.printingId })
    for (const row of rows) productIds.set(row.printingId!, row.id)
  }

  // 5. Referenzpreise
  const priceRows = all.flatMap(p => {
    const productId = productIds.get(printingIds.get(`${p.setId}|${p.externalId}`)!)
    if (!productId || !p.prices) return []
    return p.prices
      .filter(pr => pr.lowCents || pr.avgCents || pr.trendCents)
      .map(pr => ({
        productId,
        source: pr.source,
        finish: pr.finish,
        currency: pr.currency,
        lowCents: pr.lowCents ?? null,
        avgCents: pr.avgCents ?? null,
        trendCents: pr.trendCents ?? null,
      }))
  })
  const uniquePrices = [...new Map(priceRows.map(r => [`${r.productId}|${r.source}|${r.finish}`, r])).values()]
  for (const part of chunk(uniquePrices, 2000)) {
    await db.insert(referencePrices).values(part).onConflictDoUpdate({
      target: [referencePrices.productId, referencePrices.source, referencePrices.finish],
      set: {
        currency: sql`excluded.currency`,
        lowCents: sql`excluded.low_cents`,
        avgCents: sql`excluded.avg_cents`,
        trendCents: sql`excluded.trend_cents`,
        updatedAt: sql`now()`,
      },
    })
  }

  return { cards: cardMap.size, printings: all.length, skipped }
}

/** Zählt den aktuellen Stand eines Spiels in der Datenbank. */
export async function countGame(gameId: number) {
  const [row] = await db.select({
    sets: sql<number>`(select count(*)::int from ${sets} where ${sets.gameId} = ${gameId})`,
    cards: sql<number>`(select count(*)::int from ${cards} where ${cards.gameId} = ${gameId})`,
    products: sql<number>`(select count(*)::int from ${products} where ${products.gameId} = ${gameId})`,
  }).from(games).where(and(eq(games.id, gameId)))
  return row!
}
