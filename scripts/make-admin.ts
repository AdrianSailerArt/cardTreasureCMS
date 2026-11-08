import { eq } from 'drizzle-orm'
import { client, db, schema } from './import/lib/db'

/*
 * Ernennt einen Nutzer zum Admin (legt ihn bei Bedarf an).
 *   bun run make-admin anna@cardtreasure.eu "Anna Beispiel"
 *   bun run make-admin anna@cardtreasure.eu --revoke
 */
const [email, ...rest] = process.argv.slice(2)
const revoke = rest.includes('--revoke')
const name = rest.find(a => !a.startsWith('--')) ?? email?.split('@')[0]

if (!email || !email.includes('@')) {
  console.error('Aufruf: bun run make-admin <email> ["Name"] [--revoke]')
  process.exit(1)
}

try {
  const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, email))
  if (existing) {
    await db.update(schema.user).set({ role: revoke ? 'user' : 'admin' }).where(eq(schema.user.id, existing.id))
    console.log(`${email} ist jetzt ${revoke ? 'kein Admin mehr' : 'Admin'}`)
  }
  else if (!revoke) {
    await db.insert(schema.user).values({ id: crypto.randomUUID(), email, name: name!, emailVerified: true, role: 'admin' })
    console.log(`${email} als Admin angelegt`)
  }
}
finally {
  await client.end()
}
