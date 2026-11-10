/*
 * Entwicklungsserver des CMS, im lokalen Netzwerk erreichbar: bun run dev
 * Setzt Site- und Shop-URL auf die LAN-Adresse, damit Anmeldelinks und Links/Bilder zum Shop auch auf anderen Geräten
 * funktionieren. Ablauf und Regeln stehen in @cardtreasure/core/dev-server, gleich wie im Shop.
 */
import { startDevServer } from '@cardtreasure/core/dev-server'

startDevServer({ label: 'CMS', defaultPort: 3100, lanUrls: { NUXT_PUBLIC_SITE_URL: 3100, NUXT_PUBLIC_SHOP_URL: 3000 } })
