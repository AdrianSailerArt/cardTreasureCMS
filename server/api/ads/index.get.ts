import type { AdsOverview } from '~/types/admin'

/** Regeln, laufende Werbung und Werbeertrag (Catch-all [...path] deckt den Pfad ohne Unterpfad nicht ab). */
export default defineEventHandler(async (event): Promise<AdsOverview> => await shopInternal(event, 'ads'))
