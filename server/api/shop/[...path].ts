/**
 * Eigener Shop von CardTreasure: an die interne Shop-API weiterreichen (Logik und Prüfungen im Shop).
 *   GET  /api/shop/listings                 eigene Angebote
 *   POST /api/shop/listings                 Angebot anlegen
 *   PUT  /api/shop/listings/<id>            Angebot ändern, pausieren
 *   GET  /api/shop/printings?q=             Karten mit Drucken zum Anlegen
 *   GET  /api/shop/sales                    Verkäufe mit Packliste
 *   POST /api/shop/sales/<id>/ship|cancel   versenden, stornieren
 */
const ALLOWED = [/^listings$/, /^listings\/[0-9a-f-]{36}$/, /^printings$/, /^sales$/, /^sales\/[0-9a-f-]{36}\/(ship|cancel)$/]

export default defineEventHandler(async (event): Promise<unknown> => await proxyShopInternal(event, 'platform', ALLOWED))
