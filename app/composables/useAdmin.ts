import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({ plugins: [magicLinkClient()] })

export interface Me { id: string, name: string, email: string }

/** Angemeldeter Admin, einmal pro Seitenaufruf geladen. */
export const useMe = () => useState<Me | null>('me', () => null)

export const GAME_LABEL: Record<string, string> = { mtg: 'Magic', pokemon: 'Pokémon', yugioh: 'Yu-Gi-Oh!' }

export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Wartet auf Zahlung', paid: 'Bezahlt', shipped: 'Versendet', delivered: 'Zugestellt',
  completed: 'Abgeschlossen', cancelled: 'Storniert', disputed: 'Reklamation',
  pending_payment: 'Offen', draft: 'Entwurf', published: 'Veröffentlicht', archived: 'Archiviert',
  running: 'Läuft', succeeded: 'Erfolgreich', failed: 'Fehlgeschlagen',
}

export type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'danger'

/** Farbton (aus dem Color-Set) für einen Status. */
export const statusTone = (status: string): Tone => {
  if (['completed', 'succeeded', 'published'].includes(status)) return 'success'
  if (['paid', 'shipped', 'delivered', 'running'].includes(status)) return 'info'
  if (['awaiting_payment', 'pending_payment', 'draft'].includes(status)) return 'warning'
  if (['cancelled', 'disputed', 'failed'].includes(status)) return 'danger'
  return 'neutral'
}

export const euro = (cents: number | null | undefined, digits = 2) =>
  cents === null || cents === undefined
    ? '–'
    : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits, minimumFractionDigits: digits }).format(cents / 100)

export const num = (n: number | null | undefined) => (n === null || n === undefined ? '–' : new Intl.NumberFormat('de-DE').format(n))

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '–'

/** Veränderung in Prozent gegenüber dem Vorzeitraum, z.B. "+12 %". */
export const delta = (current: number, previous: number): { text: string, up: boolean } | null => {
  if (!previous) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  return { text: `${pct > 0 ? '+' : ''}${pct} %`, up: pct >= 0 }
}

/** Ländername auf Deutsch aus dem ISO-Code, z.B. "NL" → "Niederlande". */
export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['de-DE'], { type: 'region' }).of(code.toUpperCase()) ?? code
  }
  catch {
    return code
  }
}
