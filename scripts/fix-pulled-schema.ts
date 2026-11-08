/*
 * Korrigiert bekannte Fehler von `drizzle-kit pull` im erzeugten Schema.
 * Läuft automatisch nach `bun run db:pull`.
 *
 * - Leere Array-Standardwerte ('{}') werden als [""] erzeugt; das ist falsch und bricht die Typen.
 */
const file = new URL('../server/db/generated/schema.ts', import.meta.url)
let src = await Bun.file(file).text()

const before = src
src = src.replaceAll('.default([""])', ".default(sql`'{}'`)")
if (!/import \{[^}]*\bsql\b[^}]*\} from "drizzle-orm"/.test(src)) {
  src = `import { sql } from "drizzle-orm"\n${src}`
}

await Bun.write(file, src)
console.log(before === src ? 'Schema: nichts zu korrigieren' : 'Schema: Array-Standardwerte korrigiert')
