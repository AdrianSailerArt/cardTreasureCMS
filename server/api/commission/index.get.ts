import type { CommissionOverride } from '~/types/admin'

/** Allgemeiner Satz und Freigaben (Catch-all [...path] deckt den Pfad ohne Unterpfad nicht ab). */
export default defineEventHandler(async (event): Promise<{ rateBps: number, overrides: CommissionOverride[] }> =>
  await shopInternal(event, 'commission'))
