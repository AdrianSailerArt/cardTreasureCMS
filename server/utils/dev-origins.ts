/* KOPIE aus dem Shop (cardtresure/server/utils/dev-origins.ts). */
import { lanAddresses } from '../../scripts/lib/lan'

/**
 * Herkünfte, denen die Anmeldung in der Entwicklung vertraut: localhost und die LAN-Adressen dieses Rechners
 * (für Tests auf Handy/Tablet im selben WLAN). Im Echtbetrieb leer; dort gilt nur die Site-URL.
 */
export const devOrigins = (ports: number[]) => (import.meta.dev
  ? ['localhost', '127.0.0.1', ...lanAddresses()].flatMap(host => ports.map(port => `http://${host}:${port}`))
  : [])
