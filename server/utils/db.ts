import type { SQL } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/generated/schema'

let instance: ReturnType<typeof createDb> | undefined

function createDb() {
  const url = useRuntimeConfig().databaseUrl
  if (!url) throw new Error('NUXT_DATABASE_URL ist nicht gesetzt')
  const client = postgres(url, { prepare: false, max: 5 })
  return drizzle(client, { schema })
}

export function useDb() {
  instance ??= createDb()
  return instance
}

export { schema }

/** Führt eine lesende SQL-Abfrage aus und gibt die Zeilen typisiert zurück. */
export async function rows<T>(query: SQL): Promise<T[]> {
  return await useDb().execute(query) as unknown as T[]
}
