import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { schema } from './db'

const createAuth = () => {
  const config = useRuntimeConfig()
  return betterAuth({
    baseURL: config.public.siteUrl,
    secret: config.betterAuthSecret,
    // Eigenes Cookie, damit sich Shop- und Admin-Sitzung nicht überschreiben
    advanced: { cookiePrefix: 'ct-admin' },
    database: drizzleAdapter(useDb(), {
      provider: 'pg',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    user: {
      additionalFields: {
        role: { type: 'string', input: false },
      },
    },
    plugins: [
      magicLink({
        // Im Admin-Tool kann sich niemand neu registrieren. Admins werden per `bun run make-admin` ernannt.
        disableSignUp: true,
        async sendMagicLink({ email, url }) {
          // Nur an echte Admins verschicken; alle anderen bekommen dieselbe Antwort, aber keine Mail
          const [user] = await useDb().select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.email, email))
          if (user?.role !== 'admin') return
          console.info(`[auth] Admin-Magic-Link für ${email}: ${url}`)
        },
      }),
    ],
  })
}

let instance: ReturnType<typeof createAuth> | undefined

export const useAuth = () => {
  instance ??= createAuth()
  return instance
}

export interface AdminUser { id: string, name: string, email: string }

/** Liefert den angemeldeten Admin oder wirft 401/403. Für alle internen API-Routen. */
export const requireAdmin = async (event: H3Event): Promise<AdminUser> => {
  const session = await useAuth().api.getSession({ headers: event.headers })
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Nicht angemeldet' })
  const user = session.user as typeof session.user & { role?: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Kein Admin' })
  return { id: user.id, name: user.name, email: user.email }
}
