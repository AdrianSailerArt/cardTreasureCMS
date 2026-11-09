import { defineConfig } from 'drizzle-kit'

/*
 * Das Datenbankschema gehört dem Shop-Repo (cardTreasure). Dieses Repo erzeugt keine Migrationen,
 * sondern liest das Schema mit `bun run db:pull` aus der Datenbank und legt es in
 * server/db/generated ab. Nach jeder Migration im Shop einmal neu ziehen.
 */
export default defineConfig({
  dialect: 'postgresql',
  out: './server/db/generated',
  casing: 'camelCase',
  introspect: { casing: 'camel' },
  dbCredentials: {
    // Migrationen und Schema-Abgleich nicht über den Transaktions-Pooler: bei Supabase die Session-Verbindung (Port 5432)
    url: (process.env.NUXT_DATABASE_MIGRATION_URL || process.env.NUXT_DATABASE_URL)!,
  },
})
