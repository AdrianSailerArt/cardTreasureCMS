/* KOPIE aus dem Shop (cardtresure/server/lib/images.ts). Änderungen dort machen und hierher übernehmen; später gemeinsames Paket. */
/*
 * Fotos an Angeboten und von Admins ersetzte Kartenbilder.
 * Nur SQL über `db.execute`, damit Shop und CMS (mit eigenem, generiertem Schema) dieselbe Datei verwenden können.
 * Ablauf beim Hochladen: Bild verarbeiten → Dateien speichern → Datenbank; schlägt die Datenbank fehl, werden die Dateien wieder gelöscht.
 */
import { sql, type SQL } from 'drizzle-orm'
import { MediaError, mediaKey, processImage, type MediaStore } from './media'

/** Nur was beide Apps gemeinsam haben: eine Drizzle-Datenbank mit execute und transaction */
export interface SqlDb {
  execute: (query: SQL) => Promise<unknown>
  transaction: <T>(fn: (tx: SqlDb) => Promise<T>) => Promise<T>
}

const rowsOf = async <T>(db: SqlDb, query: SQL) => await db.execute(query) as unknown as T[]

// Im Shop aus shared/utils/photos.ts; das CMS braucht die Werte nicht
const MAX_LISTING_PHOTOS = 4
export { MAX_LISTING_PHOTOS }

/** Bild verarbeiten, speichern und als Medium eintragen. Liefert die Medien-ID. */
const storeImage = async (db: SqlDb, store: MediaStore, ownerId: string, purpose: string, input: Uint8Array, link: (tx: SqlDb, mediaId: string) => Promise<void>) => {
  const image = await processImage(input)
  const id = crypto.randomUUID()
  await store.put(mediaKey(id, 'full'), image.full, 'image/webp')
  await store.put(mediaKey(id, 'thumb'), image.thumb, 'image/webp')
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        insert into media (id, owner_id, purpose, width, height, bytes)
        values (${id}, ${ownerId}, ${purpose}, ${image.width}, ${image.height}, ${image.full.byteLength})
      `)
      await link(tx, id)
    })
  }
  catch (e) {
    await Promise.all([store.remove(mediaKey(id, 'full')), store.remove(mediaKey(id, 'thumb'))])
    throw e
  }
  return id
}

const removeMedia = async (db: SqlDb, store: MediaStore, mediaId: string) => {
  await db.execute(sql`delete from media where id = ${mediaId}`)
  await Promise.all([store.remove(mediaKey(mediaId, 'full')), store.remove(mediaKey(mediaId, 'thumb'))])
}

// ---------------------------------------------------------------- Angebotsfotos

/** Foto an ein eigenes Angebot hängen (höchstens MAX_LISTING_PHOTOS). */
export const addListingPhoto = async (db: SqlDb, store: MediaStore, sellerId: string, listingId: string, input: Uint8Array) => {
  const [listing] = await rowsOf<{ sellerId: string, status: string, photos: number }>(db, sql`
    select seller_id as "sellerId", status::text as status,
           (select count(*)::int from listing_photos where listing_id = l.id) as photos
    from listings l where id = ${listingId}
  `)
  if (!listing || listing.sellerId !== sellerId || listing.status === 'removed') throw new MediaError('NOT_FOUND', 'Angebot nicht gefunden', 404)
  if (listing.photos >= MAX_LISTING_PHOTOS) throw new MediaError('LIMIT', `Höchstens ${MAX_LISTING_PHOTOS} Fotos pro Angebot`)

  const id = await storeImage(db, store, sellerId, 'listing_photo', input, async (tx, mediaId) => {
    // Sperre auf das Angebot, damit parallele Uploads die Obergrenze nicht überschreiten.
    // Erst sperren, dann zählen: In einer einzigen Abfrage würde die Zählung den Stand vor dem Warten auf die Sperre sehen.
    await tx.execute(sql`select id from listings where id = ${listingId} for update`)
    const [locked] = await rowsOf<{ n: number }>(tx, sql`select count(*)::int as n from listing_photos where listing_id = ${listingId}`)
    if ((locked?.n ?? 0) >= MAX_LISTING_PHOTOS) throw new MediaError('LIMIT', `Höchstens ${MAX_LISTING_PHOTOS} Fotos pro Angebot`)
    await tx.execute(sql`insert into listing_photos (listing_id, media_id, position) values (${listingId}, ${mediaId}, ${locked!.n})`)
  })
  return { id }
}

export const removeListingPhoto = async (db: SqlDb, store: MediaStore, sellerId: string, listingId: string, mediaId: string) => {
  const [row] = await rowsOf<{ ok: boolean }>(db, sql`
    select true as ok from listing_photos lp join listings l on l.id = lp.listing_id
    where lp.listing_id = ${listingId} and lp.media_id = ${mediaId} and l.seller_id = ${sellerId}
  `)
  if (!row) throw new MediaError('NOT_FOUND', 'Foto nicht gefunden', 404)
  await removeMedia(db, store, mediaId)
}

/** Foto-IDs je Angebot (in Reihenfolge). */
export const photosOf = async (db: SqlDb, listingIds: string[]) => {
  const map = new Map<string, string[]>()
  if (!listingIds.length) return map
  const rows = await rowsOf<{ listingId: string, mediaId: string }>(db, sql`
    select listing_id as "listingId", media_id as "mediaId" from listing_photos
    where listing_id in (${sql.join(listingIds.map(id => sql`${id}::uuid`), sql`, `)})
    order by position
  `)
  for (const r of rows) map.set(r.listingId, [...(map.get(r.listingId) ?? []), r.mediaId])
  return map
}

// ---------------------------------------------------------------- Kartenbilder (Admins)

/** Kartenbild eines Drucks ersetzen. Ein vorheriger Ersatz wird gelöscht. */
export const replaceCardImage = async (db: SqlDb, store: MediaStore, adminId: string, printingId: string, input: Uint8Array, reason?: string | null) => {
  const [exists] = await rowsOf<{ old: string | null }>(db, sql`
    select (select media_id from printing_image_overrides where printing_id = p.id)::text as old from printings p where p.id = ${printingId}
  `)
  if (!exists) throw new MediaError('NOT_FOUND', 'Druck nicht gefunden', 404)
  const id = await storeImage(db, store, adminId, 'card_image', input, async (tx, mediaId) => {
    await tx.execute(sql`
      insert into printing_image_overrides (printing_id, media_id, reason, replaced_by) values (${printingId}, ${mediaId}, ${reason ?? null}, ${adminId})
      on conflict (printing_id) do update set media_id = excluded.media_id, reason = excluded.reason, replaced_by = excluded.replaced_by, created_at = now()
    `)
  })
  if (exists.old) await removeMedia(db, store, exists.old)
  return { mediaId: id }
}

/** Ersatz entfernen, wieder das Bild aus der Quelle zeigen. */
export const resetCardImage = async (db: SqlDb, store: MediaStore, printingId: string) => {
  const [row] = await rowsOf<{ mediaId: string }>(db, sql`select media_id as "mediaId" from printing_image_overrides where printing_id = ${printingId}`)
  if (!row) return
  await db.execute(sql`delete from printing_image_overrides where printing_id = ${printingId}`)
  await removeMedia(db, store, row.mediaId)
}

export const cardImageOverride = async (db: SqlDb, printingId: string) => {
  const [row] = await rowsOf<{ mediaId: string }>(db, sql`select media_id as "mediaId" from printing_image_overrides where printing_id = ${printingId}`)
  return row?.mediaId ?? null
}
