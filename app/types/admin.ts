/** Antwort-Typen der internen API, geteilt von Seiten und Komponenten. */

export interface Kpi { gmv: number, commission: number, orders: number, shipments: number, buyers: number, items: number }

export interface TopSeller { name: string, type: string, country: string, gmv: number, shipments: number, rating: number | null }
export interface TopProduct { name: string, game: string, slug: string | null, items: number, gmv: number }
export interface RecentOrder { number: string, buyer: string, buyerCountry: string | null, createdAt: string, total: number, status: string, shipments: string[] }

export interface Overview {
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

export interface GameCatalog {
  code: string, name: string, sets: number, setsWithCards: number, cards: number, products: number,
  withPrice: number, withGerman: number, lastSuccess: string | null
}
export interface ImportRun {
  id: string, game: string, status: string, args: string | null, trigger: string,
  stats: Record<string, number>, error: string | null, startedAt: string, finishedAt: string | null
}

export interface PostRow {
  id: string, slug: string, status: string, titleDe: string | null, titleEn: string | null,
  author: string, game: string | null, publishedAt: string | null, updatedAt: string, cardRefs: number
}

export interface CardSearchHit { ref: string, name: string, nameDe: string | null, game: string, setName: string | null }

/** Antwort der internen Shop-API /api/internal/risks (Vertrag, Logik im Shop: server/lib/moderation.ts). */
export interface SellerRisk {
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
