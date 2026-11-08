import { pgTable, unique, text, boolean, timestamp, index, foreignKey, uuid, integer, uniqueIndex, jsonb, char, serial, check, date, smallint, primaryKey, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const cardCondition = pgEnum("card_condition", ['mint', 'near_mint', 'excellent', 'good', 'light_played', 'played', 'poor'])
export const cardFinish = pgEnum("card_finish", ['normal', 'foil', 'etched', 'holo', 'reverse_holo'])
export const cardLanguage = pgEnum("card_language", ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh_cn', 'zh_tw'])
export const deckBoard = pgEnum("deck_board", ['main', 'side', 'extra', 'commander', 'maybe'])
export const gameCode = pgEnum("game_code", ['mtg', 'pokemon', 'yugioh'])
export const importStatus = pgEnum("import_status", ['running', 'succeeded', 'failed'])
export const ledgerKind = pgEnum("ledger_kind", ['sale', 'commission', 'purchase', 'payout', 'refund', 'adjustment'])
export const listingStatus = pgEnum("listing_status", ['active', 'paused', 'sold_out', 'removed'])
export const orderStatus = pgEnum("order_status", ['pending_payment', 'paid', 'cancelled'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'succeeded', 'failed', 'refunded'])
export const postStatus = pgEnum("post_status", ['draft', 'published', 'archived'])
export const priceSource = pgEnum("price_source", ['cardmarket', 'tcgplayer'])
export const productKind = pgEnum("product_kind", ['single', 'sealed'])
export const reviewDirection = pgEnum("review_direction", ['buyer_to_seller', 'seller_to_buyer'])
export const sealedType = pgEnum("sealed_type", ['booster', 'booster_display', 'collector_booster', 'bundle', 'elite_trainer_box', 'starter_deck', 'structure_deck', 'commander_deck', 'tin', 'collection_box', 'other'])
export const sellerType = pgEnum("seller_type", ['private', 'commercial'])
export const shipmentStatus = pgEnum("shipment_status", ['awaiting_payment', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed'])
export const shippingFormat = pgEnum("shipping_format", ['standard', 'compact', 'large', 'maxi', 'parcel'])
export const shippingProvider = pgEnum("shipping_provider", ['dhl', 'deutsche_post', 'other'])
export const siteLocale = pgEnum("site_locale", ['de', 'en'])
export const userRole = pgEnum("user_role", ['user', 'admin'])

export const orderNumberSeq = pgSequence("order_number_seq", {  startWith: "100000", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	username: text(),
	role: userRole().default('user').notNull(),
	locale: siteLocale().default('de').notNull(),
	bannedAt: timestamp("banned_at", { withTimezone: true, mode: 'string' }),
	isDemo: boolean("is_demo").default(false).notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
	unique("user_username_unique").on(table.username),
]);

export const shipments = pgTable("shipments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	sellerId: text("seller_id").notNull(),
	status: shipmentStatus().default('awaiting_payment').notNull(),
	itemsCents: integer("items_cents").notNull(),
	shippingCents: integer("shipping_cents").notNull(),
	commissionCents: integer("commission_cents").notNull(),
	carrier: shippingProvider(),
	trackingNumber: text("tracking_number"),
	labelPath: text("label_path"),
	stripeTransferId: text("stripe_transfer_id"),
	shippedAt: timestamp("shipped_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	shippingService: text("shipping_service"),
	shippingFormat: shippingFormat("shipping_format"),
	packageWeightG: integer("package_weight_g"),
}, (table) => [
	index("shipments_order_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("shipments_seller_status_idx").using("btree", table.sellerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "shipments_order_id_orders_id_fk"
		}),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.userId],
			name: "shipments_seller_id_seller_profiles_user_id_fk"
		}),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	number: text().notNull(),
	buyerId: text("buyer_id").notNull(),
	status: orderStatus().default('pending_payment').notNull(),
	shippingAddress: jsonb("shipping_address").notNull(),
	itemsCents: integer("items_cents").notNull(),
	shippingCents: integer("shipping_cents").notNull(),
	totalCents: integer("total_cents").notNull(),
	currency: char({ length: 3 }).default('EUR').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	idempotencyKey: text("idempotency_key"),
}, (table) => [
	uniqueIndex("orders_buyer_idempotency_uq").using("btree", table.buyerId.asc().nullsLast().op("text_ops"), table.idempotencyKey.asc().nullsLast().op("text_ops")),
	index("orders_buyer_idx").using("btree", table.buyerId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [user.id],
			name: "orders_buyer_id_user_id_fk"
		}),
	unique("orders_number_unique").on(table.number),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("account_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const addresses = pgTable("addresses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	street: text().notNull(),
	houseNumber: text("house_number").notNull(),
	extra: text(),
	postalCode: text("postal_code").notNull(),
	city: text().notNull(),
	country: char({ length: 2 }).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
}, (table) => [
	index("addresses_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "addresses_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const cards = pgTable("cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	gameId: integer("game_id").notNull(),
	externalId: text("external_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	typeLine: text("type_line"),
	attributes: jsonb().default({}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("cards_game_external_uq").using("btree", table.gameId.asc().nullsLast().op("int4_ops"), table.externalId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("cards_game_slug_uq").using("btree", table.gameId.asc().nullsLast().op("int4_ops"), table.slug.asc().nullsLast().op("int4_ops")),
	index("cards_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "cards_game_id_games_id_fk"
		}),
]);

export const games = pgTable("games", {
	id: serial().primaryKey().notNull(),
	code: gameCode().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("games_code_unique").on(table.code),
]);

export const listings = pgTable("listings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sellerId: text("seller_id").notNull(),
	productId: uuid("product_id").notNull(),
	condition: cardCondition(),
	language: cardLanguage().notNull(),
	finish: cardFinish().default('normal').notNull(),
	isFirstEdition: boolean("is_first_edition").default(false).notNull(),
	isSigned: boolean("is_signed").default(false).notNull(),
	isAltered: boolean("is_altered").default(false).notNull(),
	comment: text(),
	imagePaths: text("image_paths").array().default(sql`'{}'`).notNull(),
	quantity: integer().notNull(),
	priceCents: integer("price_cents").notNull(),
	status: listingStatus().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("listings_product_price_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("enum_ops"), table.priceCents.asc().nullsLast().op("enum_ops")),
	index("listings_seller_idx").using("btree", table.sellerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.userId],
			name: "listings_seller_id_seller_profiles_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "listings_product_id_products_id_fk"
		}),
	check("listings_min_price_chk", sql`price_cents >= 10`),
	check("listings_quantity_chk", sql`quantity >= 0`),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipments.id],
			name: "conversations_shipment_id_shipments_id_fk"
		}),
]);

export const decks = pgTable("decks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	gameId: integer("game_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	format: text(),
	description: text(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("decks_user_slug_uq").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.slug.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "decks_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "decks_game_id_games_id_fk"
		}),
]);

export const sellerProfiles = pgTable("seller_profiles", {
	userId: text("user_id").primaryKey().notNull(),
	type: sellerType().notNull(),
	displayName: text("display_name").notNull(),
	country: char({ length: 2 }).notNull(),
	shipFromAddressId: uuid("ship_from_address_id"),
	companyName: text("company_name"),
	vatId: text("vat_id"),
	imprint: text(),
	terms: text(),
	taxId: text("tax_id"),
	dateOfBirth: date("date_of_birth"),
	stripeAccountId: text("stripe_account_id"),
	payoutsEnabled: boolean("payouts_enabled").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "seller_profiles_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.shipFromAddressId],
			foreignColumns: [addresses.id],
			name: "seller_profiles_ship_from_address_id_addresses_id_fk"
		}),
	unique("seller_profiles_stripe_account_id_unique").on(table.stripeAccountId),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	gameId: integer("game_id").notNull(),
	kind: productKind().notNull(),
	printingId: uuid("printing_id"),
	sealedProductId: uuid("sealed_product_id"),
	slug: text().notNull(),
	name: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "products_game_id_games_id_fk"
		}),
	foreignKey({
			columns: [table.printingId],
			foreignColumns: [printings.id],
			name: "products_printing_id_printings_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sealedProductId],
			foreignColumns: [sealedProducts.id],
			name: "products_sealed_product_id_sealed_products_id_fk"
		}).onDelete("cascade"),
	unique("products_printing_id_unique").on(table.printingId),
	unique("products_sealed_product_id_unique").on(table.sealedProductId),
	unique("products_slug_unique").on(table.slug),
	check("products_kind_ref_chk", sql`((kind = 'single'::product_kind) AND (printing_id IS NOT NULL) AND (sealed_product_id IS NULL)) OR ((kind = 'sealed'::product_kind) AND (sealed_product_id IS NOT NULL) AND (printing_id IS NULL))`),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	senderId: text("sender_id").notNull(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messages_conversation_idx").using("btree", table.conversationId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [user.id],
			name: "messages_sender_id_user_id_fk"
		}),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	orderId: uuid("order_id").notNull(),
	provider: text().default('stripe').notNull(),
	providerRef: text("provider_ref").notNull(),
	amountCents: integer("amount_cents").notNull(),
	status: paymentStatus().default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payments_order_id_orders_id_fk"
		}),
	unique("payments_provider_ref_unique").on(table.providerRef),
]);

export const posts = pgTable("posts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	authorId: text("author_id").notNull(),
	gameId: integer("game_id"),
	status: postStatus().default('draft').notNull(),
	coverImagePath: text("cover_image_path"),
	tags: text().array().default(sql`'{}'`).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("posts_status_published_idx").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.publishedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "posts_author_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "posts_game_id_games_id_fk"
		}),
	unique("posts_slug_unique").on(table.slug),
]);

export const printings = pgTable("printings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	cardId: uuid("card_id").notNull(),
	setId: uuid("set_id").notNull(),
	externalId: text("external_id").notNull(),
	collectorNumber: text("collector_number"),
	rarity: text(),
	finishes: cardFinish().array().default(sql`'{}'`).notNull(),
	languages: cardLanguage().array().default(sql`'{}'`).notNull(),
	hasFirstEdition: boolean("has_first_edition").default(false).notNull(),
	artist: text(),
	imagePath: text("image_path"),
	sourceImageUrl: text("source_image_url"),
	externalRefs: jsonb("external_refs").default({}).notNull(),
	attributes: jsonb().default({}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("printings_card_idx").using("btree", table.cardId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("printings_set_external_uq").using("btree", table.setId.asc().nullsLast().op("text_ops"), table.externalId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "printings_card_id_cards_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.setId],
			foreignColumns: [sets.id],
			name: "printings_set_id_sets_id_fk"
		}),
]);

export const sets = pgTable("sets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	gameId: integer("game_id").notNull(),
	externalId: text("external_id").notNull(),
	code: text().notNull(),
	name: text().notNull(),
	names: jsonb().default({}).notNull(),
	setType: text("set_type"),
	series: text(),
	releaseDate: date("release_date"),
	cardCount: integer("card_count"),
	iconUrl: text("icon_url"),
	logoUrl: text("logo_url"),
	parentSetId: uuid("parent_set_id"),
	attributes: jsonb().default({}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("sets_game_external_uq").using("btree", table.gameId.asc().nullsLast().op("int4_ops"), table.externalId.asc().nullsLast().op("int4_ops")),
	index("sets_game_release_idx").using("btree", table.gameId.asc().nullsLast().op("int4_ops"), table.releaseDate.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "sets_game_id_games_id_fk"
		}),
]);

export const sealedProducts = pgTable("sealed_products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	gameId: integer("game_id").notNull(),
	setId: uuid("set_id"),
	type: sealedType().notNull(),
	name: text().notNull(),
	names: jsonb().default({}).notNull(),
	language: cardLanguage().notNull(),
	ean: text(),
	releaseDate: date("release_date"),
	description: text(),
	imagePath: text("image_path"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.gameId],
			foreignColumns: [games.id],
			name: "sealed_products_game_id_games_id_fk"
		}),
	foreignKey({
			columns: [table.setId],
			foreignColumns: [sets.id],
			name: "sealed_products_set_id_sets_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "sealed_products_created_by_user_id_fk"
		}),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	direction: reviewDirection().notNull(),
	authorId: text("author_id").notNull(),
	subjectId: text("subject_id").notNull(),
	ratingOverall: smallint("rating_overall").notNull(),
	ratingDescription: smallint("rating_description"),
	ratingPackaging: smallint("rating_packaging"),
	comment: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("reviews_shipment_direction_uq").using("btree", table.shipmentId.asc().nullsLast().op("uuid_ops"), table.direction.asc().nullsLast().op("uuid_ops")),
	index("reviews_subject_idx").using("btree", table.subjectId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipments.id],
			name: "reviews_shipment_id_shipments_id_fk"
		}),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "reviews_author_id_user_id_fk"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [user.id],
			name: "reviews_subject_id_user_id_fk"
		}),
	check("reviews_rating_chk", sql`(rating_overall >= 1) AND (rating_overall <= 5)`),
]);

export const sellerShippingAccounts = pgTable("seller_shipping_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sellerId: text("seller_id").notNull(),
	provider: shippingProvider().notNull(),
	billingNumber: text("billing_number"),
	credentialsEncrypted: text("credentials_encrypted").notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("seller_shipping_provider_uq").using("btree", table.sellerId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [sellerProfiles.userId],
			name: "seller_shipping_accounts_seller_id_seller_profiles_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("session_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const shipmentItems = pgTable("shipment_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	listingId: uuid("listing_id"),
	productId: uuid("product_id").notNull(),
	condition: cardCondition(),
	language: cardLanguage().notNull(),
	finish: cardFinish().notNull(),
	isFirstEdition: boolean("is_first_edition").default(false).notNull(),
	quantity: integer().notNull(),
	unitPriceCents: integer("unit_price_cents").notNull(),
}, (table) => [
	index("shipment_items_product_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipments.id],
			name: "shipment_items_shipment_id_shipments_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "shipment_items_listing_id_listings_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "shipment_items_product_id_products_id_fk"
		}),
]);

export const wishlists = pgTable("wishlists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "wishlists_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const wishlistItems = pgTable("wishlist_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	wishlistId: uuid("wishlist_id").notNull(),
	cardId: uuid("card_id"),
	productId: uuid("product_id"),
	quantity: integer().default(1).notNull(),
	minCondition: cardCondition("min_condition"),
	languages: cardLanguage().array(),
	finish: cardFinish(),
	maxPriceCents: integer("max_price_cents"),
}, (table) => [
	foreignKey({
			columns: [table.wishlistId],
			foreignColumns: [wishlists.id],
			name: "wishlist_items_wishlist_id_wishlists_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "wishlist_items_card_id_cards_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlist_items_product_id_products_id_fk"
		}),
	check("wishlist_items_target_chk", sql`(card_id IS NULL) <> (product_id IS NULL)`),
]);

export const importRuns = pgTable("import_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	game: gameCode().notNull(),
	status: importStatus().default('running').notNull(),
	args: text(),
	trigger: text().default('manual').notNull(),
	stats: jsonb().default({}).notNull(),
	error: text(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("import_runs_game_started_idx").using("btree", table.game.asc().nullsLast().op("timestamptz_ops"), table.startedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const ledgerEntries = pgTable("ledger_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	kind: ledgerKind().notNull(),
	amountCents: integer("amount_cents").notNull(),
	orderId: uuid("order_id"),
	shipmentId: uuid("shipment_id"),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ledger_user_created_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "ledger_entries_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "ledger_entries_order_id_orders_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipments.id],
			name: "ledger_entries_shipment_id_shipments_id_fk"
		}).onDelete("set null"),
	check("ledger_amount_nonzero_chk", sql`amount_cents <> 0`),
]);

export const postCardRefs = pgTable("post_card_refs", {
	postId: uuid("post_id").notNull(),
	cardId: uuid("card_id").notNull(),
}, (table) => [
	index("post_card_refs_card_idx").using("btree", table.cardId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_card_refs_post_id_posts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "post_card_refs_card_id_cards_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.postId, table.cardId], name: "post_card_refs_post_id_card_id_pk"}),
]);

export const conversationParticipants = pgTable("conversation_participants", {
	conversationId: uuid("conversation_id").notNull(),
	userId: text("user_id").notNull(),
	lastReadAt: timestamp("last_read_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("conversation_participants_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "conversation_participants_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "conversation_participants_user_id_user_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.conversationId, table.userId], name: "conversation_participants_conversation_id_user_id_pk"}),
]);

export const cardTranslations = pgTable("card_translations", {
	cardId: uuid("card_id").notNull(),
	language: cardLanguage().notNull(),
	name: text().notNull(),
	text: text(),
}, (table) => [
	index("card_translations_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "card_translations_card_id_cards_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.cardId, table.language], name: "card_translations_card_id_language_pk"}),
]);

export const cartItems = pgTable("cart_items", {
	userId: text("user_id").notNull(),
	listingId: uuid("listing_id").notNull(),
	quantity: integer().notNull(),
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "cart_items_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "cart_items_listing_id_listings_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.listingId], name: "cart_items_user_id_listing_id_pk"}),
]);

export const deckCards = pgTable("deck_cards", {
	deckId: uuid("deck_id").notNull(),
	cardId: uuid("card_id").notNull(),
	board: deckBoard().default('main').notNull(),
	quantity: integer().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.deckId],
			foreignColumns: [decks.id],
			name: "deck_cards_deck_id_decks_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cardId],
			foreignColumns: [cards.id],
			name: "deck_cards_card_id_cards_id_fk"
		}),
	primaryKey({ columns: [table.deckId, table.cardId, table.board], name: "deck_cards_deck_id_card_id_board_pk"}),
]);

export const postTranslations = pgTable("post_translations", {
	postId: uuid("post_id").notNull(),
	locale: siteLocale().notNull(),
	title: text().notNull(),
	excerpt: text(),
	bodyMd: text("body_md").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_translations_post_id_posts_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.postId, table.locale], name: "post_translations_post_id_locale_pk"}),
]);

export const priceHistory = pgTable("price_history", {
	productId: uuid("product_id").notNull(),
	finish: cardFinish().default('normal').notNull(),
	day: date().notNull(),
	lowCents: integer("low_cents"),
	avgSoldCents: integer("avg_sold_cents"),
	trendCents: integer("trend_cents"),
	soldCount: integer("sold_count").default(0).notNull(),
	listingCount: integer("listing_count").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "price_history_product_id_products_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.productId, table.finish, table.day], name: "price_history_product_id_finish_day_pk"}),
]);

export const referencePrices = pgTable("reference_prices", {
	productId: uuid("product_id").notNull(),
	source: priceSource().notNull(),
	finish: cardFinish().default('normal').notNull(),
	currency: text().notNull(),
	lowCents: integer("low_cents"),
	avgCents: integer("avg_cents"),
	trendCents: integer("trend_cents"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "reference_prices_product_id_products_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.productId, table.source, table.finish], name: "reference_prices_product_id_source_finish_pk"}),
]);
