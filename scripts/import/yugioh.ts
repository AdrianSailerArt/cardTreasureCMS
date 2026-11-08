import type { CardLanguage } from './lib/db'
import { countGame, ensureGame, upsertBatch, upsertSets, type NormCard, type NormPrinting } from './lib/upsert'
import { chunk, fetchJson, log, slugify, toCents, type CliArgs } from './lib/util'

/*
 * Yu-Gi-Oh! über YGOPRODeck API v7 (https://ygoprodeck.com/api-guide/).
 *
 * Drei Anfragen für alles: Set-Liste, alle Karten (englisch), alle Karten (deutsch).
 * Die API erlaubt max. 20 Anfragen pro Sekunde und verbietet das direkte Einbinden der Bilder.
 *
 * card     = Passcode (YGOPRODeck id)
 * printing = Eintrag aus card_sets. Der Sprachteil im Set-Code wird entfernt
 *            (LOB-EN001 / LOB-DE001 → LOB-001), dazu die Seltenheit, weil derselbe Code
 *            in mehreren Seltenheiten erscheinen kann.
 */

const API = 'https://db.ygoprodeck.com/api/v7'
const BATCH = 1000

interface YgoSet { set_name: string, set_code: string, num_of_cards?: number, tcg_date?: string, set_image?: string }

interface YgoCard {
  id: number
  name: string
  desc?: string
  type?: string
  humanReadableCardType?: string
  frameType?: string
  race?: string
  attribute?: string
  atk?: number
  def?: number
  level?: number
  linkval?: number
  linkmarkers?: string[]
  scale?: number
  archetype?: string
  typeline?: string[]
  card_sets?: { set_name: string, set_code: string, set_rarity: string, set_rarity_code?: string, set_price?: string }[]
  card_images?: { id: number, image_url: string }[]
}

/** LOB-EN001 → LOB-001 · SDK-E001 → SDK-001 · YGLD-ENA01 → YGLD-A01 */
export function normalizeSetCode(code: string): string {
  const m = code.match(/^([A-Z0-9]+)-([A-Z]{0,2})([A-Z]?\d+[A-Z]?)$/i)
  return m ? `${m[1]}-${m[3]}`.toUpperCase() : code.toUpperCase()
}

function rarityKey(r: { set_rarity: string, set_rarity_code?: string }): string {
  const code = r.set_rarity_code?.replace(/[()]/g, '').trim()
  return code || slugify(r.set_rarity).toUpperCase()
}

function normalize(c: YgoCard, de: YgoCard | undefined, wantedCodes?: Set<string>) {
  const passcode = String(c.id)
  const languages: CardLanguage[] = de ? ['en', 'de'] : ['en']

  const card: NormCard = {
    externalId: passcode,
    slug: `${slugify(c.name)}-${passcode}`,
    name: c.name,
    typeLine: c.humanReadableCardType ?? c.type ?? null,
    attributes: {
      type: c.type,
      frameType: c.frameType,
      race: c.race,
      attribute: c.attribute ?? null,
      atk: c.atk ?? null,
      def: c.def ?? null,
      level: c.level ?? null,
      linkval: c.linkval ?? null,
      linkmarkers: c.linkmarkers ?? null,
      scale: c.scale ?? null,
      archetype: c.archetype ?? null,
      typeline: c.typeline ?? null,
    },
    translations: [
      { language: 'en', name: c.name, text: c.desc ?? null },
      ...(de ? [{ language: 'de' as const, name: de.name, text: de.desc ?? null }] : []),
    ],
  }

  const printings: NormPrinting[] = (c.card_sets ?? [])
    .filter(s => !wantedCodes || wantedCodes.has(s.set_code.split('-')[0]!.toUpperCase()))
    .map((s) => {
      const code = normalizeSetCode(s.set_code)
      const rarity = rarityKey(s)
      return {
        cardExternalId: passcode,
        setExternalId: slugify(s.set_name),
        externalId: `${code}:${rarity}`,
        collectorNumber: code,
        rarity: s.set_rarity,
        finishes: ['normal'],
        languages,
        sourceImageUrl: c.card_images?.[0]?.image_url ?? null,
        externalRefs: { ygoprodeck: c.id },
        productSlug: `yugioh-${slugify(code)}-${slugify(rarity)}-${slugify(c.name)}`,
        productName: c.name,
        prices: [{ source: 'tcgplayer', finish: 'normal', currency: 'USD', avgCents: toCents(s.set_price) }],
      }
    })
  return { card, printings }
}

export async function importYugioh(args: CliArgs) {
  const gameId = await ensureGame('yugioh', 'Yu-Gi-Oh!')
  const wantedCodes = args.sets ? new Set(args.sets.map(s => s.toUpperCase())) : undefined

  const [setRes, enRes, deRes] = await Promise.all([
    fetchJson<YgoSet[]>(`${API}/cardsets.php`),
    fetchJson<{ data: YgoCard[] }>(`${API}/cardinfo.php`),
    fetchJson<{ data: YgoCard[] }>(`${API}/cardinfo.php?language=de`),
  ])

  // Mehrere Einträge können denselben Set-Namen haben; der erste gewinnt
  const setsBySlug = new Map<string, YgoSet>()
  for (const s of setRes ?? []) {
    if (wantedCodes && !wantedCodes.has(s.set_code.toUpperCase())) continue
    if (!setsBySlug.has(slugify(s.set_name))) setsBySlug.set(slugify(s.set_name), s)
  }
  const setMap = await upsertSets(gameId, [...setsBySlug.entries()].map(([slug, s]) => ({
    externalId: slug,
    code: s.set_code,
    name: s.set_name,
    releaseDate: s.tcg_date && s.tcg_date !== '0000-00-00' ? s.tcg_date : null,
    cardCount: s.num_of_cards ?? null,
    logoUrl: s.set_image ?? null,
  })))
  log('yugioh', `${setMap.size} Sets`)

  const deById = new Map((deRes?.data ?? []).map(c => [c.id, c]))
  let all = enRes?.data ?? []
  if (wantedCodes) {
    all = all.filter(c => c.card_sets?.some(s => wantedCodes.has(s.set_code.split('-')[0]!.toUpperCase())))
  }
  if (args.limit) all = all.slice(0, args.limit)
  log('yugioh', `${all.length} Karten (davon ${all.filter(c => deById.has(c.id)).length} mit deutschem Text)`)

  let skipped = 0
  for (const [i, part] of chunk(all, BATCH).entries()) {
    const normalized = part.map(c => normalize(c, deById.get(c.id), wantedCodes))
    const r = await upsertBatch('yugioh', gameId, setMap,
      normalized.map(n => n.card), normalized.flatMap(n => n.printings))
    skipped += r.skipped
    log('yugioh', `Stapel ${i + 1}: ${r.cards} Karten, ${r.printings} Drucke`)
  }

  log('yugioh', `fertig, ${skipped} Drucke ohne bekanntes Set übersprungen`)
  log('yugioh', `Datenbank: ${JSON.stringify(await countGame(gameId))}`)
}
