import type { SQL } from 'drizzle-orm'
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

/** Führt eine lesende SQL-Abfrage aus und gibt die Zeilen typisiert zurück. */
export const rows = async <T>(query: SQL): Promise<T[]> => {
  return await useDb().execute(query) as unknown as T[]
}
