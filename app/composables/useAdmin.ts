import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({ plugins: [magicLinkClient()] })

export interface Me { id: string, name: string, email: string }

/** Angemeldeter Admin, einmal pro Seitenaufruf geladen. */
export const useMe = () => useState<Me | null>('me', () => null)

export const GAME_LABEL: Record<string, string> = { mtg: 'Magic', pokemon: 'Pokémon', yugioh: 'Yu-Gi-Oh!' }

/** Kartenzustand: Kürzel und Name (im Shop über i18n), Reihenfolge von bestem zu schlechtestem; der Schlüssel ist zugleich der Tag-Ton */
export const CONDITIONS = [
  { value: 'mint', short: 'MT', label: 'Mint' }, { value: 'near_mint', short: 'NM', label: 'Near Mint' },
  { value: 'excellent', short: 'EX', label: 'Excellent' }, { value: 'good', short: 'GD', label: 'Good' },
  { value: 'light_played', short: 'LP', label: 'Light Played' }, { value: 'played', short: 'PL', label: 'Played' },
  { value: 'poor', short: 'PO', label: 'Poor' },
] as const

/* Status (statusTone, statusLabel) und Formatierung kommen aus @cardtreasure/core, gleich wie im Shop. */

/** Euro aus Cent auf Deutsch, `digits` 0 für ganze Euro in Übersichten. */
export const euro = (cents: number | null | undefined, digits = 2) => formatPrice(cents, 'de', 'EUR', digits)

export const num = (n: number | null | undefined) => formatNumber(n, 'de')

export const dateTime = (iso: string | null | undefined) => formatDate(iso, 'de', true)

/** Veränderung in Prozent gegenüber dem Vorzeitraum, z.B. "+12 %". */
export const delta = (current: number, previous: number): { text: string, up: boolean } | null => {
  if (!previous) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  return { text: `${pct > 0 ? '+' : ''}${pct} %`, up: pct >= 0 }
}
