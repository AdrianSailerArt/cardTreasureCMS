import type { CardFinish, CardLanguage } from './lib/db'
import { countGame, ensureGame, upsertBatch, upsertSets, type NormCard, type NormPrice, type NormPrinting } from './lib/upsert'
import { fetchJson, log, mapLimit, slugify, toCents, type CliArgs } from './lib/util'

/*
 * Pokémon über TCGdex (https://tcgdex.dev).
 *
 * Pro Set: englische und deutsche Set-Daten (liefern auch die deutschen Kartennamen),
 * danach die Kartendetails einzeln. TCGdex hat keine druckübergreifende Karten-ID,
 * deshalb ist hier jede Karte genau ein Druck.
 */

const API = 'https://api.tcgdex.net/v2'
const CONCURRENCY = 8

type BriefSet = { id: string, name: string }
type BriefCard = { id: string, localId: string, name: string }

type FullSet = {
  id: string
  name: string
  logo?: string
  symbol?: string
  releaseDate?: string
  serie?: { id: string, name: string }
  cardCount?: { total?: number, official?: number }
  abbreviation?: { official?: string }
  cards: BriefCard[]
}

type CmPricing = {
  idProduct?: number
  low?: number | null
  avg?: number | null
  trend?: number | null
  'low-holo'?: number | null
  'avg-holo'?: number | null
  'trend-holo'?: number | null
}

type TcgCard = {
  id: string
  localId: string
  name: string
  category: string
  rarity?: string
  illustrator?: string
  image?: string
  hp?: number
  types?: string[]
  stage?: string
  evolveFrom?: string
  description?: string
  effect?: string
  trainerType?: string
  energyType?: string
  attacks?: unknown[]
  abilities?: unknown[]
  weaknesses?: unknown[]
  resistances?: unknown[]
  retreat?: number
  regulationMark?: string
  dexId?: number[]
  legal?: Record<string, boolean>
  variants?: { normal?: boolean, reverse?: boolean, holo?: boolean, firstEdition?: boolean }
  pricing?: { cardmarket?: CmPricing | null }
}

const finishesOf = (v: TcgCard['variants']): CardFinish[] => {
  const out: CardFinish[] = []
  if (v?.normal) out.push('normal')
  if (v?.holo) out.push('holo')
  if (v?.reverse) out.push('reverse_holo')
  return out.length ? out : ['normal']
}

const pricesOf = (cm: CmPricing | null | undefined, finishes: CardFinish[]): NormPrice[] => {
  if (!cm) return []
  return finishes.map((finish) => {
    const holo = finish !== 'normal'
    return {
      source: 'cardmarket' as const,
      finish,
      currency: 'EUR',
      lowCents: toCents(holo ? cm['low-holo'] : cm.low),
      avgCents: toCents(holo ? cm['avg-holo'] : cm.avg),
      trendCents: toCents(holo ? cm['trend-holo'] : cm.trend),
    }
  })
}

const normalize = (c: TcgCard, setId: string, deName: string | undefined) => {
  const finishes = finishesOf(c.variants)
  const languages: CardLanguage[] = deName ? ['en', 'de'] : ['en']

  const card: NormCard = {
    externalId: c.id,
    slug: `${slugify(c.name)}-${slugify(c.id)}`,
    name: c.name,
    typeLine: [c.category, c.stage, c.trainerType, c.energyType].filter(Boolean).join(' – ') || null,
    attributes: {
      category: c.category,
      hp: c.hp ?? null,
      types: c.types ?? null,
      stage: c.stage ?? null,
      evolveFrom: c.evolveFrom ?? null,
      attacks: c.attacks ?? null,
      abilities: c.abilities ?? null,
      weaknesses: c.weaknesses ?? null,
      resistances: c.resistances ?? null,
      retreat: c.retreat ?? null,
      regulationMark: c.regulationMark ?? null,
      dexId: c.dexId ?? null,
      legal: c.legal ?? null,
    },
    translations: [
      { language: 'en', name: c.name, text: c.effect ?? c.description ?? null },
      ...(deName ? [{ language: 'de' as const, name: deName }] : []),
    ],
  }

  const printing: NormPrinting = {
    cardExternalId: c.id,
    setExternalId: setId,
    externalId: c.id,
    collectorNumber: c.localId,
    rarity: c.rarity ?? null,
    finishes,
    languages,
    hasFirstEdition: !!c.variants?.firstEdition,
    artist: c.illustrator ?? null,
    sourceImageUrl: c.image ? `${c.image}/high.webp` : null,
    externalRefs: {
      tcgdex: c.id,
      ...(c.pricing?.cardmarket?.idProduct ? { cardmarket: c.pricing.cardmarket.idProduct } : {}),
    },
    productSlug: `pokemon-${slugify(c.id)}-${slugify(c.name)}`,
    productName: c.name,
    prices: pricesOf(c.pricing?.cardmarket, finishes),
  }
  return { card, printing }
}

export const importPokemon = async (args: CliArgs) => {
  const gameId = await ensureGame('pokemon', 'Pokémon')

  let setList = (await fetchJson<BriefSet[]>(`${API}/en/sets`))!
  if (args.sets) setList = setList.filter(s => args.sets!.includes(s.id))
  log('pokemon', `${setList.length} Sets`)

  let cardsRead = 0
  let failed = 0
  for (const [i, brief] of setList.entries()) {
    if (args.limit && cardsRead >= args.limit) break
    const [en, de] = await Promise.all([
      fetchJson<FullSet>(`${API}/en/sets/${brief.id}`),
      fetchJson<FullSet>(`${API}/de/sets/${brief.id}`),
    ])
    if (!en) continue

    const setMap = await upsertSets(gameId, [{
      externalId: en.id,
      code: en.abbreviation?.official ?? en.id.toUpperCase(),
      name: en.name,
      names: de ? { de: de.name } : {},
      series: en.serie?.name ?? null,
      releaseDate: en.releaseDate ?? null,
      cardCount: en.cardCount?.total ?? null,
      iconUrl: en.symbol ? `${en.symbol}.webp` : null,
      logoUrl: en.logo ? `${en.logo}.webp` : null,
    }])

    const deNames = new Map((de?.cards ?? []).map(c => [c.id, c.name]))
    let briefs = en.cards
    if (args.limit) briefs = briefs.slice(0, Math.max(0, args.limit - cardsRead))

    const details = await mapLimit(briefs, CONCURRENCY, async (b) => {
      try {
        return await fetchJson<TcgCard>(`${API}/en/cards/${encodeURIComponent(b.id)}`)
      }
      catch (e) {
        failed++
        log('pokemon', `Fehler bei ${b.id}: ${(e as Error).message}`)
        return null
      }
    })

    const normalized = details.filter((c): c is TcgCard => !!c).map(c => normalize(c, en.id, deNames.get(c.id)))
    const r = await upsertBatch('pokemon', gameId, setMap, normalized.map(n => n.card), normalized.map(n => n.printing))
    cardsRead += briefs.length
    log('pokemon', `[${i + 1}/${setList.length}] ${en.name}: ${r.printings} Karten`)
  }

  log('pokemon', `fertig: ${cardsRead} Karten gelesen, ${failed} Fehler`)
  log('pokemon', `Datenbank: ${JSON.stringify(await countGame(gameId))}`)
}
