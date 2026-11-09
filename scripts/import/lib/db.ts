import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { pgOptions } from '@cardtreasure/core/db'
import * as schema from '../../../server/db/generated/schema'

const url = process.env.NUXT_DATABASE_URL
if (!url) throw new Error('NUXT_DATABASE_URL ist nicht gesetzt (siehe .env.example)')

export const client = postgres(url, pgOptions(url, 4))
export const db = drizzle(client, { schema })
export { schema }

export type GameCode = (typeof schema.gameCode.enumValues)[number]
export type CardLanguage = (typeof schema.cardLanguage.enumValues)[number]
export type CardFinish = (typeof schema.cardFinish.enumValues)[number]
