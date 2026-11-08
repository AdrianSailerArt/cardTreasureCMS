import { relations } from "drizzle-orm/relations";
import { orders, shipments, sellerProfiles, user, account, addresses, games, cards, listings, products, conversations, decks, printings, sealedProducts, messages, payments, posts, sets, reviews, sellerShippingAccounts, session, shipmentItems, wishlists, wishlistItems, ledgerEntries, postCardRefs, conversationParticipants, cardTranslations, cartItems, deckCards, postTranslations, priceHistory, referencePrices } from "./schema";

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
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	shipments: many(shipments),
	user: one(user, {
		fields: [orders.buyerId],
		references: [user.id]
	}),
	payments: many(payments),
	ledgerEntries: many(ledgerEntries),
}));

export const sellerProfilesRelations = relations(sellerProfiles, ({one, many}) => ({
	shipments: many(shipments),
	listings: many(listings),
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

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	addresses: many(addresses),
	decks: many(decks),
	sellerProfiles: many(sellerProfiles),
	messages: many(messages),
	orders: many(orders),
	posts: many(posts),
	sealedProducts: many(sealedProducts),
	reviews_authorId: many(reviews, {
		relationName: "reviews_authorId_user_id"
	}),
	reviews_subjectId: many(reviews, {
		relationName: "reviews_subjectId_user_id"
	}),
	sessions: many(session),
	wishlists: many(wishlists),
	ledgerEntries: many(ledgerEntries),
	conversationParticipants: many(conversationParticipants),
	cartItems: many(cartItems),
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
	cartItems: many(cartItems),
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
	shipmentItems: many(shipmentItems),
	wishlistItems: many(wishlistItems),
	priceHistories: many(priceHistory),
	referencePrices: many(referencePrices),
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

export const paymentsRelations = relations(payments, ({one}) => ({
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
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