import type { H3Event } from 'h3'
import { createS3Store, MAX_UPLOAD_BYTES, MediaError, type MediaStore } from '../lib/media'
import type { SqlDb } from '../lib/images'

let store: MediaStore | undefined

/** Objektspeicher, derselbe wie im Shop (NUXT_MEDIA_*). */
export const useMediaStore = () => {
  store ??= createS3Store(useRuntimeConfig().media)
  return store
}

export const mediaDb = () => useDb() as unknown as SqlDb

/** Bilddatei (Feld "file") und Textfelder aus einem Multipart-Upload. */
export const readUpload = async (event: H3Event) => {
  const length = Number(getHeader(event, 'content-length') ?? 0)
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw createError({ statusCode: 413, statusMessage: 'Das Bild ist größer als 12 MB' })
  const parts = await readMultipartFormData(event) ?? []
  const file = parts.find(p => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, statusMessage: 'Keine Datei' })
  const fields = Object.fromEntries(parts.filter(p => !p.filename && p.name).map(p => [p.name!, p.data.toString('utf8')]))
  return { file: new Uint8Array(file.data), fields }
}

export const runMediaAction = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  }
  catch (e) {
    if (e instanceof MediaError) throw createError({ statusCode: e.status, statusMessage: e.message, data: { code: e.code } })
    throw e
  }
}
