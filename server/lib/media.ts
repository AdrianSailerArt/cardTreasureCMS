/* KOPIE aus dem Shop (cardtresure/server/lib/media.ts). Änderungen dort machen und hierher übernehmen; später gemeinsames Paket. */
/*
 * Bilder: verarbeiten (sharp) und im Objektspeicher ablegen (S3-API: lokal SeaweedFS, später S3 oder R2).
 * Ohne Nuxt-Abhängigkeit; Shop und CMS benutzen dieselbe Logik (CMS: Kopie in server/lib/media.ts).
 *
 * Jedes Bild wird neu kodiert: WebP, längste Seite höchstens 1600 px, Vorschau 400 px.
 * Dabei fallen alle Metadaten weg (EXIF, GPS-Position aus Handyfotos).
 */
import sharp, { type Metadata } from 'sharp'
import { AwsClient } from 'aws4fetch'

export interface MediaStoreConfig {
  endpoint: string
  bucket: string
  accessKey: string
  secretKey: string
  region?: string
}

export interface MediaStore {
  put: (key: string, body: Uint8Array, contentType: string) => Promise<void>
  get: (key: string) => Promise<{ body: Uint8Array, contentType: string } | null>
  remove: (key: string) => Promise<void>
}

export class MediaError extends Error {
  constructor(public code: 'TOO_LARGE' | 'NOT_AN_IMAGE' | 'TOO_SMALL' | 'STORAGE' | 'NOT_FOUND' | 'LIMIT', message: string, public status = 400) {
    super(message)
  }
}

/** S3-kompatibler Speicher. Legt den Bucket beim ersten Schreiben an, falls er fehlt. */
export const createS3Store = (config: MediaStoreConfig): MediaStore => {
  const client = new AwsClient({ accessKeyId: config.accessKey, secretAccessKey: config.secretKey, service: 's3', region: config.region ?? 'us-east-1' })
  const base = `${config.endpoint.replace(/\/$/, '')}/${config.bucket}`
  let bucketReady = false

  const ensureBucket = async () => {
    if (bucketReady) return
    const head = await client.fetch(base, { method: 'HEAD' })
    if (head.status === 404) {
      const created = await client.fetch(base, { method: 'PUT' })
      if (!created.ok && created.status !== 409) throw new MediaError('STORAGE', `Bucket anlegen fehlgeschlagen (${created.status})`, 500)
    }
    bucketReady = true
  }

  return {
    put: async (key, body, contentType) => {
      await ensureBucket()
      const res = await client.fetch(`${base}/${key}`, { method: 'PUT', body: body as Uint8Array<ArrayBuffer>, headers: { 'Content-Type': contentType } })
      if (!res.ok) throw new MediaError('STORAGE', `Speichern fehlgeschlagen (${res.status})`, 500)
    },
    get: async (key) => {
      const res = await client.fetch(`${base}/${key}`)
      if (res.status === 404) return null
      if (!res.ok) throw new MediaError('STORAGE', `Laden fehlgeschlagen (${res.status})`, 500)
      return { body: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get('content-type') ?? 'image/webp' }
    },
    remove: async (key) => {
      await client.fetch(`${base}/${key}`, { method: 'DELETE' })
    },
  }
}

/** Im Speicher (für Tests). */
export const createMemoryStore = (): MediaStore & { keys: () => string[] } => {
  const items = new Map<string, { body: Uint8Array, contentType: string }>()
  return {
    put: async (key, body, contentType) => { items.set(key, { body, contentType }) },
    get: async key => items.get(key) ?? null,
    remove: async (key) => { items.delete(key) },
    keys: () => [...items.keys()],
  }
}

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const MAX_SIDE = 1600
const THUMB_SIDE = 400
const MIN_SIDE = 200

export interface ProcessedImage {
  full: Uint8Array
  thumb: Uint8Array
  width: number
  height: number
}

/** Hochgeladene Datei prüfen und in WebP (groß + Vorschau) umwandeln; dreht nach EXIF-Ausrichtung, entfernt Metadaten. */
export const processImage = async (input: Uint8Array): Promise<ProcessedImage> => {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new MediaError('TOO_LARGE', 'Das Bild ist größer als 12 MB')
  let meta: Metadata
  try {
    meta = await sharp(input).metadata()
  }
  catch {
    throw new MediaError('NOT_AN_IMAGE', 'Das ist kein lesbares Bild (JPEG, PNG, WebP, HEIC)')
  }
  if (!meta.width || !meta.height || !['jpeg', 'png', 'webp', 'heif', 'avif'].includes(meta.format ?? '')) {
    throw new MediaError('NOT_AN_IMAGE', 'Erlaubt sind JPEG, PNG, WebP und HEIC')
  }
  if (Math.min(meta.width, meta.height) < MIN_SIDE) throw new MediaError('TOO_SMALL', `Das Bild ist zu klein (mindestens ${MIN_SIDE} px)`)

  const base = sharp(input).rotate() // Ausrichtung aus EXIF anwenden, danach ohne Metadaten
  const full = await base.clone().resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true })
  const thumb = await base.clone().resize(THUMB_SIDE, THUMB_SIDE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  return { full: new Uint8Array(full.data), thumb: new Uint8Array(thumb), width: full.info.width, height: full.info.height }
}

/** Speicherschlüssel eines Mediums. */
export const mediaKey = (id: string, variant: 'full' | 'thumb') => `${id.slice(0, 2)}/${id}/${variant}.webp`
