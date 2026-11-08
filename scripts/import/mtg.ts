import type { CardFinish, CardLanguage } from './lib/db'
import { countGame, ensureGame, upsertBatch, upsertSets, type NormCard, type NormPrinting, type NormSet } from './lib/upsert'
import { fetchJson, fetchJsonLines, log, slugify, toCents, type CliArgs } from './lib/util'

/*
 * Magic: The Gathering über Scryfall.
 *
 * Voller Import: Bulk-Datei `all_cards` (alle Sprachen, mehrere GB) als JSONL-Stream.
 * Mit --sets=lea,mh3 wird stattdessen die Such-API pro Set genutzt (schnell, gut zum Testen).
 * Scryfall liefert pro Sprache ein eigenes Objekt. Diese werden über Set + Sammlernummer
 * zu einem Druck zusammengefasst; das englische Objekt liefert Bild, Preise und Details.
 */

const API = 'https://api.scryfall.com'
const BATCH = 2000

interface ScryFace {
  name: string
  oracle_id?: string
  mana_cost?: string
  type_line?: string
  oracle_text?: string
  printed_name?: string
  printed_text?: string
  power?: string
  toughness?: string
  loyalty?: string
  image_uris?: Record<string, string>
}

interface ScryCard extends ScryFace {
  id: string
  lang: string
  layout: string
  set: string
  collector_number: string
  rarity: string
  finishes: string[]
  digital: boolean
  games: string[]
  cmc?: number
  colors?: string[]
  color_identity?: string[]
  keywords?: string[]
  legalities?: Record<string, string>
  card_faces?: ScryFace[]
  artist?: string
  cardmarket_id?: number
  tcgplayer_id?: number
  prices?: Record<string, string | null>
  frame?: string
  border_color?: string
  full_art?: boolean
  promo?: boolean
  released_at?: string
}

interface ScrySet {
  code: string
  name: string
  set_type: string
  released_at?: string
  card_count: number
  digital: boolean
  block?: string
  parent_set_code?: string
  icon_svg_uri?: string
}

const LANGS: Record<string, CardLanguage> = {
  en: 'en', de: 'de', fr: 'fr', it: 'it', es: 'es', pt: 'pt', ru: 'ru', ja: 'ja', ko: 'ko', zhs: 'zh_cn', zht: 'zh_tw',
}
const FINISHES: Record<string, CardFinish> = { nonfoil: 'normal', foil: 'foil', etched: 'etched' }

const faceJoin = (c: ScryCard, key: keyof ScryFace, sep: string): string | null => {
  const own = c[key]
  if (typeof own === 'string' && own) return own
  const parts = (c.card_faces ?? []).map(f => f[key]).filter((v): v is string => typeof v === 'string' && !!v)
  return parts.length ? parts.join(sep) : null
}

const normalize = (c: ScryCard): { card: NormCard, printing: NormPrinting } | null => {
  const language = LANGS[c.lang]
  if (!language || c.digital || !c.games?.includes('paper')) return null

  const oracleId = c.oracle_id ?? c.card_faces?.[0]?.oracle_id ?? c.id
  const isEnglish = language === 'en'

  const translations: NormCard['translations'] = [
    isEnglish
      ? { language, name: c.name, text: faceJoin(c, 'oracle_text', '\n//\n') }
      : { language, name: faceJoin(c, 'printed_name', ' // ') ?? c.name, text: faceJoin(c, 'printed_text', '\n//\n') },
  ]

  const card: NormCard = {
    externalId: oracleId,
    slug: `${slugify(c.name)}-${oracleId.slice(0, 8)}`,
    name: c.name,
    typeLine: c.type_line ?? faceJoin(c, 'type_line', ' // '),
    attributes: {
      layout: c.layout,
      manaCost: faceJoin(c, 'mana_cost', ' // '),
      cmc: c.cmc,
      colors: c.colors ?? null,
      colorIdentity: c.color_identity,
      keywords: c.keywords,
      power: c.power ?? null,
      toughness: c.toughness ?? null,
      loyalty: c.loyalty ?? null,
      legalities: c.legalities,
    },
    translations,
  }

  const finishes = c.finishes.map(f => FINISHES[f]).filter((f): f is CardFinish => !!f)
  const prices = isEnglish && c.prices
    ? ([['eur', 'normal'], ['eur_foil', 'foil'], ['eur_etched', 'etched']] as const).map(([key, finish]) => ({
        source: 'cardmarket' as const, finish, currency: 'EUR', trendCents: toCents(c.prices![key]),
      }))
    : undefined

  const printing: NormPrinting = {
    cardExternalId: oracleId,
    setExternalId: c.set,
    externalId: c.collector_number,
    collectorNumber: c.collector_number,
    rarity: c.rarity,
    finishes: finishes.length ? finishes : ['normal'],
    languages: [language],
    artist: c.artist ?? null,
    sourceImageUrl: isEnglish ? (c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null) : null,
    externalRefs: isEnglish
      ? Object.fromEntries(Object.entries({ scryfall: c.id, cardmarket: c.cardmarket_id, tcgplayer: c.tcgplayer_id })
          .filter(([, v]) => v !== undefined)) as Record<string, string | number>
      : {},
    attributes: {
      frame: c.frame, borderColor: c.border_color, fullArt: c.full_art, promo: c.promo, releasedAt: c.released_at,
    },
    productSlug: `mtg-${slugify(c.set)}-${slugify(c.collector_number)}-${slugify(c.name)}`,
    productName: c.name,
    prices,
    mergeOnly: !isEnglish,
  }
  return { card, printing }
}

async function* cardsFromSearch(setCodes: string[]): AsyncGenerator<ScryCard> {
  for (const code of setCodes) {
    const q = encodeURIComponent(`e:${code} lang:any`)
    let url: string | null = `${API}/cards/search?q=${q}&unique=prints&include_extras=true&include_variations=true`
    while (url) {
      const page: { data: ScryCard[], has_more: boolean, next_page?: string } | null = await fetchJson(url)
      if (!page) break
      yield* page.data
      url = page.has_more ? page.next_page! : null
      // Die Such-API von Scryfall ist strenger begrenzt als der Rest; 500 ms Abstand bleiben sicher darunter
      await new Promise(r => setTimeout(r, 500))
    }
  }
}

async function* cardsFromBulk(type: string): AsyncGenerator<ScryCard> {
  const bulk = await fetchJson<{ download_uri: string, jsonl_download_uri?: string, size?: number }>(`${API}/bulk-data/${type}`)
  if (!bulk?.jsonl_download_uri) throw new Error(`Bulk-Datei ${type} ohne JSONL-Download`)
  yield* fetchJsonLines<ScryCard>(bulk.jsonl_download_uri)
}

export const importMtg = async (args: CliArgs) => {
  const gameId = await ensureGame('mtg', 'Magic: The Gathering')

  const setRes = await fetchJson<{ data: ScrySet[] }>(`${API}/sets`)
  const wanted = args.sets?.map(s => s.toLowerCase())
  const setList: NormSet[] = setRes!.data
    .filter(s => !s.digital)
    .filter(s => !wanted || wanted.includes(s.code) || wanted.includes(s.parent_set_code ?? ''))
    .map(s => ({
      externalId: s.code,
      code: s.code.toUpperCase(),
      name: s.name,
      setType: s.set_type,
      series: s.block ?? null,
      releaseDate: s.released_at ?? null,
      cardCount: s.card_count,
      iconUrl: s.icon_svg_uri ?? null,
      parentExternalId: s.parent_set_code ?? null,
    }))
  const setMap = await upsertSets(gameId, setList)
  log('mtg', `${setMap.size} Sets`)

  const bulkType = typeof args.bulk === 'string' ? args.bulk : 'all_cards'
  const source = wanted ? cardsFromSearch(setList.map(s => s.externalId)) : cardsFromBulk(bulkType)
  log('mtg', wanted ? `Suche für Sets: ${wanted.join(', ')}` : `Bulk-Datei: ${bulkType}`)

  let seen = 0
  let cardBuf: NormCard[] = []
  let printBuf: NormPrinting[] = []
  const totals = { cards: 0, printings: 0, skipped: 0 }
  const flush = async () => {
    if (!printBuf.length) return
    const r = await upsertBatch('mtg', gameId, setMap, cardBuf, printBuf)
    totals.cards += r.cards; totals.printings += r.printings; totals.skipped += r.skipped
    cardBuf = []; printBuf = []
    log('mtg', `${seen} Objekte gelesen`)
  }

  for await (const raw of source) {
    if (args.limit && seen >= args.limit) break
    seen++
    const n = normalize(raw)
    if (!n) continue
    cardBuf.push(n.card)
    printBuf.push(n.printing)
    if (printBuf.length >= BATCH) await flush()
  }
  await flush()

  log('mtg', `fertig: ${seen} Objekte, ${totals.skipped} ohne passendes Set übersprungen`)
  log('mtg', `Datenbank: ${JSON.stringify(await countGame(gameId))}`)
}
