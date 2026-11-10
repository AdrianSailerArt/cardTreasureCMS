/**
 * Werbung: an die interne Shop-API weiterreichen (dort geprüft, protokolliert, Händler benachrichtigt).
 *   GET  /api/ads                    Regeln, laufende Werbung, Werbeertrag
 *   PUT  /api/ads/settings           Regeln ändern (Mindest-/Höchstsatz, Mindestbetrag, Frist, an/aus)
 *   POST /api/ads/<listingId>/end    einzelne Werbung beenden (mit Grund)
 */
const ALLOWED = [/^settings$/, /^[0-9a-f-]{36}\/end$/]

export default defineEventHandler(async (event): Promise<unknown> => await proxyShopInternal(event, 'ads', ALLOWED))
