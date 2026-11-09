import type { CommissionOverride, CommissionTier } from '~/types/admin'

/** Staffel und Freigaben (Catch-all [...path] deckt den Pfad ohne Unterpfad nicht ab). */
export default defineEventHandler(async (event): Promise<{ tiers: CommissionTier[], overrides: CommissionOverride[] }> =>
  await shopInternal(event, 'commission'))
