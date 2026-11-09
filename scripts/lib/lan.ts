/* KOPIE aus dem Shop (cardtresure/scripts/lib/lan.ts). */
import { networkInterfaces } from 'node:os'

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

/** Private IPv4-Adressen dieses Rechners (WLAN/LAN zuerst). */
export const lanAddresses = () => Object.entries(networkInterfaces())
  .sort(([a], [b]) => Number(b.startsWith('en')) - Number(a.startsWith('en')))
  .flatMap(([, list]) => list ?? [])
  .filter(i => i.family === 'IPv4' && !i.internal && PRIVATE.test(i.address))
  .map(i => i.address)

export const lanAddress = () => lanAddresses()[0] ?? null
