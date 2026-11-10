import { relations } from "drizzle-orm/relations";
import { sellerProfiles, listings, products, user, orders, shipments, account, addresses, games, cards, conversations, decks, printings, sealedProducts, messages, posts, sets, sellerShippingAccounts, session, wishlists, wishlistItems, reviews, payments, shipmentItems, notifications, ledgerEntries, media, printingImageOverrides, moderationLog, commissionSettings, commissionOverrides, paymentRefunds, reports, adClicks, adSettings, cartExpirations, paymentIncidents, postCardRefs, conversationParticipants, userBadges, listingPhotos, cardTranslations, cartItems, deckCards, postTranslations, priceHistory, referencePrices } from "./schema";

export const listingsRelations = relations(listings, ({one, many}) => ({
	sellerProfile: one(sellerProfiles, {
		fields: [listings.sellerId],
		references: [sellerProfiles.userId]
	}),
	product: one(products, {
		fields: [listings.productId],
		references: [products.id]
	}),
	shipmentItems: many(shipmentItems),
	adClicks: many(adClicks),
	cartExpirations: many(cartExpirations),
	listingPhotos: many(listingPhotos),
	cartItems: many(cartItems),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({one, many}) => ({
	listings: many(listings),
	shipments: many(shipments),
	user: one(user, {
		fields: [sellerProfiles.userId],
		references: [user.id]
	}),
	address: one(addresses, {
		fields: [sellerProfiles.shipFromAddressId],
		references: [addresses.id]
	}),
	sellerShippingAccounts: many(sellerShippingAccounts),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	listings: many(listings),
	game: one(games, {
		fields: [products.gameId],
		references: [games.id]
	}),
	printing: one(printings, {
		fields: [products.printingId],
		references: [printings.id]
	}),
	sealedProduct: one(sealedProducts, {
		fields: [products.sealedProductId],
		references: [sealedProducts.id]
	}),
	wishlistItems: many(wishlistItems),
	shipmentItems: many(shipmentItems),
	priceHistories: many(priceHistory),
	referencePrices: many(referencePrices),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(user, {
		fields: [orders.buyerId],
		references: [user.id]
	}),
	shipments: many(shipments),
	payments: many(payments),
	ledgerEntries: many(ledgerEntries),
	paymentIncidents: many(paymentIncidents),
}));

export const userRelations = relations(user, ({many}) => ({
	orders: many(orders),
	accounts: many(account),
	addresses: many(addresses),
	decks: many(decks),
	messages: many(messages),
	sellerProfiles: many(sellerProfiles),
	posts: many(posts),
	sealedProducts: many(sealedProducts),
	sessions: many(session),
	wishlists: many(wishlists),
	reviews_authorId: many(reviews, {
		relationName: "reviews_authorId_user_id"
	}),
	reviews_subjectId: many(reviews, {
		relationName: "reviews_subjectId_user_id"
	}),
	notifications: many(notifications),
	ledgerEntries: many(ledgerEntries),
	media: many(media),
	printingImageOverrides: many(printingImageOverrides),
	moderationLogs: many(moderationLog),
	commissionSettings: many(commissionSettings),
	commissionOverrides_sellerId: many(commissionOverrides, {
		relationName: "commissionOverrides_sellerId_user_id"
	}),
	commissionOverrides_grantedBy: many(commissionOverrides, {
		relationName: "commissionOverrides_grantedBy_user_id"
	}),
	reports_handledBy: many(reports, {
		relationName: "reports_handledBy_user_id"
	}),
	reports_reporterId: many(reports, {
		relationName: "reports_reporterId_user_id"
	}),
	reports_subjectUserId: many(reports, {
		relationName: "reports_subjectUserId_user_id"
	}),
	adClicks: many(adClicks),
	adSettings: many(adSettings),
	cartExpirations: many(cartExpirations),
	paymentIncidents: many(paymentIncidents),
	conversationParticipants: many(conversationParticipants),
	userBadges: many(userBadges),
	cartItems: many(cartItems),
}));

export const shipmentsRelations = relations(shipments, ({one, many}) => ({
	order: one(orders, {
		fields: [shipments.orderId],
		references: [orders.id]
	}),
	sellerProfile: one(sellerProfiles, {
		fields: [shipments.sellerId],
		references: [sellerProfiles.userId]
	}),
	conversations: many(conversations),
	reviews: many(reviews),
	shipmentItems: many(shipmentItems),
	ledgerEntries: many(ledgerEntries),
	paymentRefunds: many(paymentRefunds),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const addressesRelations = relations(addresses, ({one, many}) => ({
	user: one(user, {
		fields: [addresses.userId],
		references: [user.id]
	}),
	sellerProfiles: many(sellerProfiles),
}));

export const cardsRelations = relations(cards, ({one, many}) => ({
	game: one(games, {
		fields: [cards.gameId],
		references: [games.id]
	}),
	printings: many(printings),
	wishlistItems: many(wishlistItems),
	postCardRefs: many(postCardRefs),
	cardTranslations: many(cardTranslations),
	deckCards: many(deckCards),
}));

export const gamesRelations = relations(games, ({many}) => ({
	cards: many(cards),
	decks: many(decks),
	products: many(products),
	posts: many(posts),
	sets: many(sets),
	sealedProducts: many(sealedProducts),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	shipment: one(shipments, {
		fields: [conversations.shipmentId],
		references: [shipments.id]
	}),
	messages: many(messages),
	conversationParticipants: many(conversationParticipants),
}));

export const decksRelations = relations(decks, ({one, many}) => ({
	user: one(user, {
		fields: [decks.userId],
		references: [user.id]
	}),
	game: one(games, {
		fields: [decks.gameId],
		references: [games.id]
	}),
	deckCards: many(deckCards),
}));

export const printingsRelations = relations(printings, ({one, many}) => ({
	products: many(products),
	card: one(cards, {
		fields: [printings.cardId],
		references: [cards.id]
	}),
	set: one(sets, {
		fields: [printings.setId],
		references: [sets.id]
	}),
	printingImageOverrides: many(printingImageOverrides),
}));

export const sealedProductsRelations = relations(sealedProducts, ({one, many}) => ({
	products: many(products),
	game: one(games, {
		fields: [sealedProducts.gameId],
		references: [games.id]
	}),
	set: one(sets, {
		fields: [sealedProducts.setId],
		references: [sets.id]
	}),
	user: one(user, {
		fields: [sealedProducts.createdBy],
		references: [user.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	user: one(user, {
		fields: [messages.senderId],
		references: [user.id]
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	user: one(user, {
		fields: [posts.authorId],
		references: [user.id]
	}),
	game: one(games, {
		fields: [posts.gameId],
		references: [games.id]
	}),
	postCardRefs: many(postCardRefs),
	postTranslations: many(postTranslations),
}));

export const setsRelations = relations(sets, ({one, many}) => ({
	printings: many(printings),
	game: one(games, {
		fields: [sets.gameId],
		references: [games.id]
	}),
	sealedProducts: many(sealedProducts),
}));

export const sellerShippingAccountsRelations = relations(sellerShippingAccounts, ({one}) => ({
	sellerProfile: one(sellerProfiles, {
		fields: [sellerShippingAccounts.sellerId],
		references: [sellerProfiles.userId]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const wishlistsRelations = relations(wishlists, ({one, many}) => ({
	user: one(user, {
		fields: [wishlists.userId],
		references: [user.id]
	}),
	wishlistItems: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({one}) => ({
	wishlist: one(wishlists, {
		fields: [wishlistItems.wishlistId],
		references: [wishlists.id]
	}),
	card: one(cards, {
		fields: [wishlistItems.cardId],
		references: [cards.id]
	}),
	product: one(products, {
		fields: [wishlistItems.productId],
		references: [products.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	shipment: one(shipments, {
		fields: [reviews.shipmentId],
		references: [shipments.id]
	}),
	user_authorId: one(user, {
		fields: [reviews.authorId],
		references: [user.id],
		relationName: "reviews_authorId_user_id"
	}),
	user_subjectId: one(user, {
		fields: [reviews.subjectId],
		references: [user.id],
		relationName: "reviews_subjectId_user_id"
	}),
}));

export const paymentsRelations = relations(payments, ({one, many}) => ({
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
	}),
	paymentRefunds: many(paymentRefunds),
}));

export const shipmentItemsRelations = relations(shipmentItems, ({one}) => ({
	shipment: one(shipments, {
		fields: [shipmentItems.shipmentId],
		references: [shipments.id]
	}),
	listing: one(listings, {
		fields: [shipmentItems.listingId],
		references: [listings.id]
	}),
	product: one(products, {
		fields: [shipmentItems.productId],
		references: [products.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id]
	}),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({one}) => ({
	user: one(user, {
		fields: [ledgerEntries.userId],
		references: [user.id]
	}),
	order: one(orders, {
		fields: [ledgerEntries.orderId],
		references: [orders.id]
	}),
	shipment: one(shipments, {
		fields: [ledgerEntries.shipmentId],
		references: [shipments.id]
	}),
}));

export const mediaRelations = relations(media, ({one, many}) => ({
	user: one(user, {
		fields: [media.ownerId],
		references: [user.id]
	}),
	printingImageOverrides: many(printingImageOverrides),
	listingPhotos: many(listingPhotos),
}));

export const printingImageOverridesRelations = relations(printingImageOverrides, ({one}) => ({
	printing: one(printings, {
		fields: [printingImageOverrides.printingId],
		references: [printings.id]
	}),
	media: one(media, {
		fields: [printingImageOverrides.mediaId],
		references: [media.id]
	}),
	user: one(user, {
		fields: [printingImageOverrides.replacedBy],
		references: [user.id]
	}),
}));

export const moderationLogRelations = relations(moderationLog, ({one}) => ({
	user: one(user, {
		fields: [moderationLog.adminId],
		references: [user.id]
	}),
}));

export const commissionSettingsRelations = relations(commissionSettings, ({one}) => ({
	user: one(user, {
		fields: [commissionSettings.updatedBy],
		references: [user.id]
	}),
}));

export const commissionOverridesRelations = relations(commissionOverrides, ({one}) => ({
	user_sellerId: one(user, {
		fields: [commissionOverrides.sellerId],
		references: [user.id],
		relationName: "commissionOverrides_sellerId_user_id"
	}),
	user_grantedBy: one(user, {
		fields: [commissionOverrides.grantedBy],
		references: [user.id],
		relationName: "commissionOverrides_grantedBy_user_id"
	}),
}));

export const paymentRefundsRelations = relations(paymentRefunds, ({one}) => ({
	payment: one(payments, {
		fields: [paymentRefunds.paymentId],
		references: [payments.id]
	}),
	shipment: one(shipments, {
		fields: [paymentRefunds.shipmentId],
		references: [shipments.id]
	}),
}));

export const reportsRelations = relations(reports, ({one}) => ({
	user_handledBy: one(user, {
		fields: [reports.handledBy],
		references: [user.id],
		relationName: "reports_handledBy_user_id"
	}),
	user_reporterId: one(user, {
		fields: [reports.reporterId],
		references: [user.id],
		relationName: "reports_reporterId_user_id"
	}),
	user_subjectUserId: one(user, {
		fields: [reports.subjectUserId],
		references: [user.id],
		relationName: "reports_subjectUserId_user_id"
	}),
}));

export const adClicksRelations = relations(adClicks, ({one}) => ({
	listing: one(listings, {
		fields: [adClicks.listingId],
		references: [listings.id]
	}),
	user: one(user, {
		fields: [adClicks.userId],
		references: [user.id]
	}),
}));

export const adSettingsRelations = relations(adSettings, ({one}) => ({
	user: one(user, {
		fields: [adSettings.updatedBy],
		references: [user.id]
	}),
}));

export const cartExpirationsRelations = relations(cartExpirations, ({one}) => ({
	user: one(user, {
		fields: [cartExpirations.userId],
		references: [user.id]
	}),
	listing: one(listings, {
		fields: [cartExpirations.listingId],
		references: [listings.id]
	}),
}));

export const paymentIncidentsRelations = relations(paymentIncidents, ({one}) => ({
	order: one(orders, {
		fields: [paymentIncidents.orderId],
		references: [orders.id]
	}),
	user: one(user, {
		fields: [paymentIncidents.userId],
		references: [user.id]
	}),
}));

export const postCardRefsRelations = relations(postCardRefs, ({one}) => ({
	post: one(posts, {
		fields: [postCardRefs.postId],
		references: [posts.id]
	}),
	card: one(cards, {
		fields: [postCardRefs.cardId],
		references: [cards.id]
	}),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({one}) => ({
	conversation: one(conversations, {
		fields: [conversationParticipants.conversationId],
		references: [conversations.id]
	}),
	user: one(user, {
		fields: [conversationParticipants.userId],
		references: [user.id]
	}),
}));

export const userBadgesRelations = relations(userBadges, ({one}) => ({
	user: one(user, {
		fields: [userBadges.userId],
		references: [user.id]
	}),
}));

export const listingPhotosRelations = relations(listingPhotos, ({one}) => ({
	listing: one(listings, {
		fields: [listingPhotos.listingId],
		references: [listings.id]
	}),
	media: one(media, {
		fields: [listingPhotos.mediaId],
		references: [media.id]
	}),
}));

export const cardTranslationsRelations = relations(cardTranslations, ({one}) => ({
	card: one(cards, {
		fields: [cardTranslations.cardId],
		references: [cards.id]
	}),
}));

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	user: one(user, {
		fields: [cartItems.userId],
		references: [user.id]
	}),
	listing: one(listings, {
		fields: [cartItems.listingId],
		references: [listings.id]
	}),
}));

export const deckCardsRelations = relations(deckCards, ({one}) => ({
	deck: one(decks, {
		fields: [deckCards.deckId],
		references: [decks.id]
	}),
	card: one(cards, {
		fields: [deckCards.cardId],
		references: [cards.id]
	}),
}));

export const postTranslationsRelations = relations(postTranslations, ({one}) => ({
	post: one(posts, {
		fields: [postTranslations.postId],
		references: [posts.id]
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({one}) => ({
	product: one(products, {
		fields: [priceHistory.productId],
		references: [products.id]
	}),
}));

export const referencePricesRelations = relations(referencePrices, ({one}) => ({
	product: one(products, {
		fields: [referencePrices.productId],
		references: [products.id]
	}),
}));