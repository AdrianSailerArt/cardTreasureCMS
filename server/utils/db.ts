import type { SqlDb } from '@cardtreasure/core/images'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { pgOptions } from '@cardtreasure/core/db'
import * as schema from '../db/generated/schema'

const createDb = () => {
  const url = useRuntimeConfig().databaseUrl
  if (!url) throw new Error('NUXT_DATABASE_URL ist nicht gesetzt')
  const client = postgres(url, pgOptions(url))
  return drizzle(client, { schema })
}

let instance: ReturnType<typeof createDb> | undefined

export const useDb = () => {
  instance ??= createDb()
  return instance
}

export { schema }

/** Datenbank für die Bild- und Sealed-Module (nur SQL, ohne Schema). */
export const mediaDb = () => useDb() as unknown as SqlDb
