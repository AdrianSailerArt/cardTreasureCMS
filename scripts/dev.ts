/*
 * CMS-Entwicklungsserver, im lokalen Netzwerk erreichbar. Setzt Site- und Shop-URL auf die LAN-Adresse,
 * damit Anmeldelinks und Links/Bilder zum Shop auch auf anderen Geräten funktionieren.
 * (Gleiches Vorgehen wie scripts/dev.ts im Shop.) Nur lokal: DEV_HOST=localhost bun run dev
 */
import { lanAddress } from './lib/lan'

const port = Number(process.env.PORT ?? 3100)
const ip = process.env.DEV_HOST === 'localhost' ? null : lanAddress()
const env: Record<string, string> = { ...process.env as Record<string, string> }
/** localhost-Werte (z.B. aus der .env) durch die LAN-Adresse ersetzen; eigene Adressen bleiben. */
const lan = (key: string, url: string) => {
  if (!env[key] || env[key].includes('localhost')) env[key] = url
}
if (ip) {
  lan('NUXT_PUBLIC_SITE_URL', `http://${ip}:${port}`)
  lan('NUXT_PUBLIC_SHOP_URL', `http://${ip}:3000`)
}

console.info(ip
  ? `\n  CMS im Netzwerk:  http://${ip}:${port}\n`
  : '\n  Kein Netzwerk gefunden, nur http://localhost erreichbar.\n')

const child = Bun.spawn(['bunx', '--bun', 'nuxt', 'dev', '--port', String(port), ...(ip ? ['--host', '0.0.0.0'] : [])], {
  env, stdio: ['inherit', 'inherit', 'inherit'],
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal))
process.exit(await child.exited)
