/*
 * Sealed-Katalog pflegen (nur Admins). Legt zu jedem Sealed-Produkt das kaufbare Produkt im Shop an
 * (products, kind = sealed), damit Angebote, Warenkorb, Wunschliste und Preisverlauf sofort funktionieren.
 */
import { sql } from 'drizzle-orm'
import { MediaError, mediaKey, processImage, type MediaStore } from './media'
import type { SqlDb } from './images'

const rowsOf = async <T>(db: SqlDb, query: ReturnType<typeof sql>) => await db.execute(query) as unknown as T[]

export interface SealedInput {
  id?: string
  game: string
  type: string
  name: string
  nameDe?: string | null
  language: string
  setId?: string | null
  releaseDate?: string | null
  ean?: string | null
  description?: string | null
}

/** Anlegen oder ändern; beim Anlegen auch das Produkt mit eindeutigem Slug. */
export const saveSealed = async (db: SqlDb, adminId: string, input: SealedInput) => await db.transaction(async (tx) => {
  const names = sql`${JSON.stringify(input.nameDe ? { de: input.nameDe } : {})}::jsonb`
  if (input.id) {
    const updated = await rowsOf<{ id: string }>(tx, sql`
      update sealed_products set type = ${input.type}::sealed_type, name = ${input.name}, names = ${names},
             language = ${input.language}::card_language, set_id = ${input.setId ?? null}, release_date = ${input.releaseDate ?? null},
             ean = ${input.ean ?? null}, description = ${input.description ?? null}, updated_at = now()
      where id = ${input.id} returning id
    `)
    if (!updated.length) throw new MediaError('NOT_FOUND', 'Produkt nicht gefunden', 404)
    await tx.execute(sql`update products set name = ${input.name} where sealed_product_id = ${input.id}`)
    return { id: input.id }
  }
  const [created] = await rowsOf<{ id: string, gameId: number }>(tx, sql`
    insert into sealed_products (game_id, type, name, names, language, set_id, release_date, ean, description, created_by)
    values ((select id from games where code = ${input.game}), ${input.type}::sealed_type, ${input.name}, ${names},
            ${input.language}::card_language, ${input.setId ?? null}, ${input.releaseDate ?? null}, ${input.ean ?? null},
            ${input.description ?? null}, ${adminId})
    returning id, game_id as "gameId"
  `)
  const slug = `${slugify(input.name, 60)}-${input.language}-${created!.id.slice(0, 6)}`
  await tx.execute(sql`
    insert into products (game_id, kind, sealed_product_id, slug, name) values (${created!.gameId}, 'sealed', ${created!.id}, ${slug}, ${input.name})
  `)
  return { id: created!.id }
})

/** Produktbild ersetzen (WebP, ohne Metadaten), altes Bild wird gelöscht. */
export const setSealedImage = async (db: SqlDb, store: MediaStore, adminId: string, sealedId: string, input: Uint8Array) => {
  const [row] = await rowsOf<{ old: string | null }>(db, sql`select image_path as old from sealed_products where id = ${sealedId}`)
  if (!row) throw new MediaError('NOT_FOUND', 'Produkt nicht gefunden', 404)
  const image = await processImage(input)
  const id = crypto.randomUUID()
  await store.put(mediaKey(id, 'full'), image.full, 'image/webp')
  await store.put(mediaKey(id, 'thumb'), image.thumb, 'image/webp')
  await db.transaction(async (tx) => {
    await tx.execute(sql`insert into media (id, owner_id, purpose, width, height, bytes) values (${id}, ${adminId}, 'sealed_image', ${image.width}, ${image.height}, ${image.full.byteLength})`)
    await tx.execute(sql`update sealed_products set image_path = ${id}, updated_at = now() where id = ${sealedId}`)
  })
  if (row.old) {
    await db.execute(sql`delete from media where id = ${row.old}`)
    await Promise.all([store.remove(mediaKey(row.old, 'full')), store.remove(mediaKey(row.old, 'thumb'))])
  }
  return { imageId: id }
}

export interface SealedRow {
  id: string
  slug: string
  game: string
  type: string
  name: string
  nameDe: string | null
  language: string
  setId: string | null
  setName: string | null
  releaseDate: string | null
  ean: string | null
  description: string | null
  imageId: string | null
  offers: number
}

const select = sql`
  select sp.id, pr.slug, g.code::text as game, sp.type::text as type, sp.name, sp.names->>'de' as "nameDe", sp.language::text as language,
         sp.set_id as "setId", s.name as "setName", to_char(sp.release_date, 'YYYY-MM-DD') as "releaseDate", sp.ean, sp.description,
         sp.image_path as "imageId",
         (select count(*)::int from listings l where l.product_id = pr.id and l.status = 'active' and l.quantity > 0) as offers
  from sealed_products sp
  join products pr on pr.sealed_product_id = sp.id
  join games g on g.id = sp.game_id
  left join sets s on s.id = sp.set_id
`

export const listSealedAdmin = async (db: SqlDb, game?: string | null) =>
  await rowsOf<SealedRow>(db, sql`${select} ${game ? sql`where g.code = ${game}` : sql``} order by sp.release_date desc nulls last, sp.name limit 500`)

export const sealedById = async (db: SqlDb, id: string) => (await rowsOf<SealedRow>(db, sql`${select} where sp.id = ${id}`))[0] ?? null
