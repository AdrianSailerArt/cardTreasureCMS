import { sql } from 'drizzle-orm'
import { marked } from 'marked'

/*
 * Kartenverweise im Blog-Markdown:   :card{ref="mtg/lightning-bolt-4457ed35"}
 * Format: <spiel>/<karten-slug>. Der Shop rendert daraus später einen Link mit Bild-Vorschau und Preis.
 */
export const CARD_REF = /:card\{ref="(mtg|pokemon|yugioh)\/([a-z0-9-]+)"\}/g

export interface CardRefInfo { game: string, slug: string, id: string, name: string, nameDe: string | null, printingId: string | null }

export function extractRefs(markdown: string): { game: string, slug: string }[] {
  const seen = new Map<string, { game: string, slug: string }>()
  for (const m of markdown.matchAll(CARD_REF)) seen.set(`${m[1]}/${m[2]}`, { game: m[1]!, slug: m[2]! })
  return [...seen.values()]
}

export async function resolveRefs(refs: { game: string, slug: string }[]): Promise<Map<string, CardRefInfo>> {
  if (!refs.length) return new Map()
  const list = await rows<CardRefInfo>(sql`
    select g.code as game, c.slug, c.id, c.name, de.name as "nameDe",
           (select p.id from printings p where p.card_id = c.id and p.source_image_url is not null limit 1) as "printingId"
    from cards c
    join games g on g.id = c.game_id
    left join card_translations de on de.card_id = c.id and de.language = 'de'
    where (g.code::text, c.slug) in (${sql.join(refs.map(r => sql`(${r.game}, ${r.slug})`), sql`, `)})
  `)
  return new Map(list.map(r => [`${r.game}/${r.slug}`, r]))
}

const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Markdown → HTML für die Vorschau im Admin-Tool; Kartenverweise werden zu Links in den Shop. */
export async function renderPreview(markdown: string, locale: 'de' | 'en'): Promise<{ html: string, missing: string[] }> {
  const refs = await resolveRefs(extractRefs(markdown))
  const shop = useRuntimeConfig().public.shopUrl
  const missing: string[] = []
  const withRefs = markdown.replace(CARD_REF, (_, game: string, slug: string) => {
    const info = refs.get(`${game}/${slug}`)
    if (!info) {
      missing.push(`${game}/${slug}`)
      return `<span class="card-ref-missing">⚠ ${escape(slug)}</span>`
    }
    const name = locale === 'de' && info.nameDe ? info.nameDe : info.name
    const img = info.printingId ? ` data-img="${shop}/img/${info.printingId}"` : ''
    return `<a class="card-ref" href="${shop}/${game}/cards/${slug}" target="_blank"${img}>${escape(name)}</a>`
  })
  const html = await marked.parse(withRefs, { gfm: true, breaks: false })
  return { html, missing }
}
