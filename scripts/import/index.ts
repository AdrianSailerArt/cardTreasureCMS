import { eq, sql } from 'drizzle-orm'
import { client, db, schema } from './lib/db'
import { countGame, ensureGame } from './lib/upsert'
import { log, parseArgs } from './lib/util'
import { importMtg } from './mtg'
import { importPokemon } from './pokemon'
import { importYugioh } from './yugioh'

/*
 * Aufruf:
 *   bun run import                        alle Spiele, voller Import
 *   bun run import mtg --sets=lea,mh3     nur bestimmte Sets (schnell, zum Testen)
 *   bun run import pokemon --limit=200    nur die ersten N Karten
 *   bun run import mtg --bulk=default_cards   nur englische Magic-Drucke (kleinere Datei)
 *
 * Set-Kennungen: Magic = Scryfall-Code (lea), Pokémon = TCGdex-ID (swsh3), Yu-Gi-Oh = Set-Präfix (LOB)
 * Jeder Lauf wird in `import_runs` protokolliert und ist im Admin-Tool unter "Imports" sichtbar.
 */

const importers = {
  mtg: { run: importMtg, name: 'Magic: The Gathering' },
  pokemon: { run: importPokemon, name: 'Pokémon' },
  yugioh: { run: importYugioh, name: 'Yu-Gi-Oh!' },
} as const
type Game = keyof typeof importers

const argv = process.argv.slice(2)
const flagArgs = argv.filter(a => a.startsWith('--'))
const args = parseArgs(flagArgs)
const requested = argv.filter(a => !a.startsWith('--'))
const unknown = requested.filter(g => !(g in importers))
if (unknown.length) {
  console.error(`Unbekanntes Spiel: ${unknown.join(', ')}. Erlaubt: ${Object.keys(importers).join(', ')}`)
  process.exit(1)
}
const selected = (requested.length ? requested : Object.keys(importers)) as Game[]
const trigger = process.env.GITHUB_ACTIONS ? 'schedule' : 'manual'

let failed = false
for (const game of selected) {
  const started = Date.now()
  const [run] = await db.insert(schema.importRuns)
    .values({ game, args: flagArgs.join(' ') || null, trigger })
    .returning({ id: schema.importRuns.id })
  try {
    await importers[game].run(args)
    const gameId = await ensureGame(game, importers[game].name)
    const stats = { ...(await countGame(gameId)), seconds: Math.round((Date.now() - started) / 1000) }
    await db.update(schema.importRuns)
      .set({ status: 'succeeded', stats, finishedAt: sql`now()` })
      .where(eq(schema.importRuns.id, run!.id))
    log(game, `Dauer: ${stats.seconds} s`)
  }
  catch (e) {
    failed = true
    console.error(`[${game}] Import fehlgeschlagen:`, e)
    await db.update(schema.importRuns)
      .set({ status: 'failed', error: String((e as Error).stack ?? e).slice(0, 4000), finishedAt: sql`now()` })
      .where(eq(schema.importRuns.id, run!.id))
  }
}

await client.end()
process.exit(failed ? 1 : 0)
