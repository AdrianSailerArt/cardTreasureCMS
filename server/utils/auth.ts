import { devOrigins } from '@cardtreasure/core/dev-origins'
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
    // Entwicklung: localhost und LAN-Adressen (Tablet/Handy im WLAN)
    trustedOrigins: devOrigins([3100], import.meta.dev),
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
    // Passwort nur für den Demo-Admin (NUXT_PUBLIC_DEMO_LOGIN=true); keine Registrierung
    emailAndPassword: { enabled: config.public.demoLogin, disableSignUp: true },
    // Nicht-Admins bekommen im CMS gar keine Sitzung (egal ob Magic-Link oder Passwort)
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [user] = await useDb().select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.id, session.userId))
            return user?.role === 'admin' ? undefined : false
          },
        },
      },
    },
    plugins: [
      magicLink({
        // Im Admin-Tool kann sich niemand neu registrieren. Admins werden per `bun run make-admin` ernannt.
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) => {
          // Nur an echte Admins verschicken; alle anderen bekommen dieselbe Antwort, aber keine Mail
          const [user] = await useDb().select({ role: schema.user.role }).from(schema.user).where(eq(schema.user.email, email))
          if (user?.role !== 'admin') return
          if (import.meta.dev) console.info(`[auth] Admin-Magic-Link für ${email}: ${url}`)
          await sendMail(email, 'CardTreasure CMS: Anmeldelink',
            `Anmelden im CMS (5 Minuten gültig):\n${url}`,
            `<p style="font-family:Helvetica,Arial,sans-serif">Anmelden im CMS (5 Minuten gültig):</p><p><a href="${url}">Jetzt anmelden</a></p>`)
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
