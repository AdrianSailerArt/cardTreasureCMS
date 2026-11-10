/** Antwort-Typen der internen API, geteilt von Seiten und Komponenten. */

export type Kpi = { gmv: number, commission: number, orders: number, shipments: number, buyers: number, items: number }

export type TopSeller = { name: string, type: string, country: string, gmv: number, shipments: number, rating: number | null }
export type TopProduct = { name: string, game: string, slug: string | null, items: number, gmv: number }
export type RecentOrder = { number: string, buyer: string, buyerCountry: string | null, createdAt: string, total: number, status: string, shipments: string[] }

export type Overview = {
  days: number
  current: Kpi
  previous: Kpi
  inventory: { activeListings: number, units: number, value: number, sellers: number, users: number, newUsers: number }
  daily: { day: string, gmv: number, orders: number }[]
  byStatus: { status: string, count: number }[]
  byGame: { game: string, gmv: number, items: number }[]
  topSellers: TopSeller[]
  topProducts: TopProduct[]
  recentOrders: RecentOrder[]
}

export type GameCatalog = {
  code: string, name: string, sets: number, setsWithCards: number, cards: number, products: number,
  withPrice: number, withGerman: number, lastSuccess: string | null
}
export type ImportRun = {
  id: string, game: string, status: string, args: string | null, trigger: string,
  stats: Record<string, number>, error: string | null, startedAt: string, finishedAt: string | null
}

export type PostRow = {
  id: string, slug: string, status: string, titleDe: string | null, titleEn: string | null,
  author: string, game: string | null, publishedAt: string | null, updatedAt: string, cardRefs: number
}

export type CardSearchHit = { ref: string, name: string, nameDe: string | null, game: string, setName: string | null }

/** Antwort der internen Shop-API /api/internal/risks (Vertrag, Logik im Shop: server/lib/moderation.ts). */
export type SellerRisk = {
  sellerId: string
  name: string
  country: string
  blocked: boolean
  level: string
  score: number
  ratedSales: number
  avgOverall: number | null
  completeRate: number | null
  overdue: number
  sellerCancels: number
  badReviews30: number
  activeListings: number
  flags: ('warning_level' | 'overdue' | 'cancels' | 'bad_reviews')[]
}

/** Provision (interne Shop-API, Logik in server/lib/commission.ts des Shops). Sätze in Basispunkten. */
export type CommissionOverride = { id: string, sellerId: string, customer: string, rateBps: number, reason: string, validFrom: string, validUntil: string | null, endedAt: string | null, grantedBy: string | null, active: boolean }
export type CustomerCommission = {
  current: { rateBps: number, source: 'override' | 'base', baseRateBps: number, override: { id: string, reason: string, validUntil: string | null } | null }
  overrides: CommissionOverride[]
}

/** Meldung (interne Shop-API, Logik in server/lib/moderation.ts des Shops). */
export type ReportView = {
  id: string
  targetType: 'user' | 'listing' | 'message'
  targetId: string
  category: 'fake' | 'fraud' | 'harassment' | 'spam' | 'wrong_item' | 'other'
  text: string | null
  status: 'open' | 'resolved' | 'dismissed'
  resolution: string | null
  createdAt: string
  handledAt: string | null
  handledBy: string | null
  reporterId: string | null
  reporter: string | null
  subjectId: string
  subject: string
  subjectBlocked: boolean
  openAgainstSubject: number
  context: string | null
}

/** Kassenabgleich (interne Shop-API, Logik in server/lib/payments.ts des Shops). Beträge in Cent. */
export type Ampel = 'success' | 'warning' | 'danger'
export type Reconciliation = { available: false } | {
  available: true
  booked: { inCents: number, feesCents: number, feesMissing: number, connectFeesCents: number, refundsCents: number, transfersCents: number, expectedCents: number }
  stripe: { availableCents: number, pendingCents: number, paidOutCents: number, totalCents: number }
  differenceCents: number
  match: Ampel
  owed: { balancesCents: number, escrowCents: number, payoutsInProgressCents: number, refundsPendingCents: number, totalCents: number }
  platform: { commissionCents: number, advertisingCents: number, feesChargedCents: number, ownSalesCents: number, feesCents: number, connectFeesCents: number, netCents: number }
  testCardCents: number
  coverageCents: number
  coverage: Ampel
  unmatched: { id: string, type: string, amountCents: number, feeCents: number, netCents: number, createdAt: string, ref: string | null, description: string | null }[]
}

/** Prüfungen im Zahlungsverkehr (interne Shop-API, Logik in server/lib/finance-checks.ts und incidents.ts des Shops). */
export type FinanceArea = 'payin' | 'refund' | 'payout' | 'commission'
export type FinanceFinding = {
  check: string, area: FinanceArea, severity: 'warning' | 'danger', message: string, amountCents: number | null
  orderNumber: string | null, userId: string | null, customer: string | null, ref: string | null, since: string | null
}
export type PaymentIncident = {
  id: string, kind: string, severity: 'warning' | 'danger', message: string, amountCents: number | null
  orderId: string | null, orderNumber: string | null, userId: string | null, customer: string | null, providerRef: string | null
  createdAt: string, resolvedAt: string | null, resolution: string | null
}
export type FinanceChecks = { checkedAt: string, checks: { check: string, area: FinanceArea }[], findings: FinanceFinding[], incidents: PaymentIncident[] }

/** Eigener Shop von CardTreasure (interne Shop-API, Logik in server/lib/listings.ts und platform.ts des Shops). */
export type PlatformListing = {
  id: string, name: string, game: string, kind: 'single' | 'sealed', setCode: string | null, setName: string | null, collectorNumber: string | null
  condition: string | null, language: string, finish: string, isFirstEdition: boolean, inToploader: boolean
  quantity: number, priceCents: number, comment: string | null, storageLocation: string | null, status: string, createdAt: string, sold: number
}
export type PlatformPrinting = { id: string, setCode: string, setName: string, collectorNumber: string | null, finishes: string[], languages: string[], hasFirstEdition: boolean }
export type PlatformCard = { id: string, name: string, nameDe: string | null, game: string, printings: PlatformPrinting[] | null }
export type PlatformSale = {
  id: string, orderNumber: string, paidAt: string | null, status: string, trackingNumber: string | null
  itemsCents: number, shippingCents: number, packagingCents: number, shippingService: string | null
  address: { name: string, street: string, houseNumber: string, extra?: string | null, postalCode: string, city: string, country: string }
  items: { name: string, quantity: number, condition: string | null, language: string, storageLocation: string | null, inToploader: boolean }[]
}

/** Werbung gewerblicher Kunden (interne Shop-API, Logik in server/lib/ads.ts des Shops). */
export type AdSettings = { enabled: boolean, minRateBps: number, maxRateBps: number, minFeeCents: number, attributionDays: number }
export type Promotion = {
  listingId: string, name: string, game: string, cardSlug: string | null
  sellerId: string, seller: string, sellerCountry: string
  rateBps: number, startedAt: string, priceCents: number, status: string
  clicks: number, adSales: number, adRevenueCents: number
}
export type AdsOverview = { settings: AdSettings, promotions: Promotion[], totals: { revenueCents: number, revenue30Cents: number, sales: number } }

/** Abgelaufene Warenkörbe (interne Shop-API, Logik in server/lib/cart-expiry.ts des Shops). */
export type CartExpiryCustomer = {
  userId: string, name: string, email: string, country: string | null
  expiries: number, items: number, valueCents: number, lastAt: string, expiriesTotal: number, orders: number, blocked: boolean
}
export type CartExpiryReport = {
  days: number, holdHours: number, repeatThreshold: number
  totals: { expiries: number, customers: number, items: number, valueCents: number, repeaters: number }
  customers: CartExpiryCustomer[]
}
export type CustomerCartExpiries = { total: number, last30: number, lastAt: string | null, repeatThreshold: number }
