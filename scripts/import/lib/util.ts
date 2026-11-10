const USER_AGENT = 'CardTreasureImporter/0.1 (+https://github.com/AdrianSailerArt/cardTreasure)'

export const slugify = (input: string): string => {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'x'
}

export const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * GET mit User-Agent und Wiederholung bei 429/5xx. Gibt bei 404 `null` zurück.
 * Bei 429 gilt die Wartezeit aus `Retry-After`, sonst exponentiell 2 s, 4 s, 8 s … (max. 60 s).
 */
export const fetchJson = async <T>(url: string, attempts = 7): Promise<T | null> => {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
    if (res.ok) return await res.json() as T
    if (res.status === 404) return null
    if (i >= attempts || (res.status < 500 && res.status !== 429)) {
      throw new Error(`GET ${url} → ${res.status} ${res.statusText}`)
    }
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 1000 * 2 ** i)
    console.warn(`  ${res.status} von ${new URL(url).host}, neuer Versuch in ${Math.round(wait / 1000)} s (${i}/${attempts - 1})`)
    await res.body?.cancel()
    await sleep(wait)
  }
}

/**
 * Liest eine JSONL-Datei als Stream Zeile für Zeile, ohne sie komplett in den Speicher zu laden.
 * Gepackte Dateien (.gz, z.B. Scryfall) werden dabei entpackt.
 */
export async function* fetchJsonLines<T>(url: string): AsyncGenerator<T> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok || !res.body) throw new Error(`GET ${url} → ${res.status}`)
  const gzipped = new URL(url).pathname.endsWith('.gz') || res.headers.get('content-type')?.includes('gzip')
  const body: ReadableStream<Uint8Array> = gzipped
    ? res.body.pipeThrough(new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>)
    : res.body
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const part of body) {
    buffer += decoder.decode(part, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line) yield JSON.parse(line) as T
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as T
}

/** Führt `fn` für alle Einträge mit begrenzter Parallelität aus. */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!, i)
    }
  }))
  return results
}

/** Euro/Dollar als Zahl oder String → ganze Cent. */
export const toCents = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null
}

export type CliArgs = {
  limit?: number
  sets?: string[]
  [key: string]: string | number | string[] | boolean | undefined
}

/** Einfache Argumente: --limit=500 --sets=lea,mh3 --bulk=default_cards */
export const parseArgs = (argv = process.argv.slice(2)): CliArgs => {
  const args: CliArgs = {}
  for (const a of argv) {
    const [k, v] = a.replace(/^--/, '').split('=')
    if (!k) continue
    if (k === 'limit') args.limit = Number(v)
    else if (k === 'sets') args.sets = (v ?? '').split(',').map(s => s.trim()).filter(Boolean)
    else args[k] = v ?? true
  }
  return args
}

export const log = (game: string, msg: string) => {
  console.log(`[${new Date().toISOString().slice(11, 19)}] [${game}] ${msg}`)
}
