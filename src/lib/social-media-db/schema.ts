import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const socialMediaChannels = pgTable("social_media_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  handle: text("handle").notNull(),
  followers: text("followers"),
  status: text("status").default("Healthy"),
  lastSync: timestamp("last_sync").defaultNow(),
  branch: text("branch"),
  // Integration fields
  isConnected: boolean("is_connected").default(false),
  // OAuth-based authentication
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("bearer"),
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenScopes: text("token_scopes").array(),
  connectedAt: timestamp("connected_at"),
  // Username/password authentication
  username: text("username"),
  password: text("password"), // Will be encrypted
  authType: text("auth_type").default("oauth"), // 'oauth' or 'username_password'
  // Platform-specific fields
  platformId: text("platform_id"), // ID from the social platform
  settings: jsonb("settings"), // Flexible platform-specific settings
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialMediaPosts = pgTable("social_media_posts", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => socialMediaChannels.id),
  platform: text("platform").notNull(),
  platformPostId: text("platform_post_id").unique(), // Unique ID from FB/IG
  date: timestamp("date").defaultNow(), // Published date
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  image: text("image"),
  tags: text("tags").array(),
  status: text("status").default("published"),
  scheduledAt: timestamp("scheduled_at"),
  mediaUrls: text("media_urls").array(),
  mediaAssetIds: integer("media_asset_ids").array(),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialMediaConversations = pgTable("social_media_conversations", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => socialMediaChannels.id),
  platformConversationId: text("platform_conversation_id").unique(),
  userName: text("user_name").notNull(),
  platform: text("platform").notNull(),
  lastMessage: text("last_message").notNull(),
  time: timestamp("time").defaultNow(),
  unread: boolean("unread").default(true),
  avatar: text("avatar"),
  priority: text("priority").default("normal"),
  assignedTo: text("assigned_to"),
  status: text("status").default("open"),
  slaDeadline: timestamp("sla_deadline"),
  tags: text("tags").array(),
  sentiment: text("sentiment"),
  participantId: text("participant_id"),
  participantPhone: text("participant_phone"),
  participantEmail: text("participant_email"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const socialMediaMessages = pgTable("social_media_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => socialMediaConversations.id, { onDelete: "cascade" }),
  channelId: integer("channel_id").references(() => socialMediaChannels.id),
  platform: text("platform").notNull(),
  platformMessageId: text("platform_message_id"),
  direction: text("direction").notNull(),
  messageType: text("message_type").notNull().default("text"),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  thumbnailUrl: text("thumbnail_url"),
  attachments: jsonb("attachments"),
  quickReplies: jsonb("quick_replies"),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").default("sent"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  responseTime: integer("response_time"),
  isAutomated: boolean("is_automated").default(false),
  sentiment: text("sentiment"),
  intent: text("intent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialMediaSalesProducts = pgTable("social_media_sales_products", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => socialMediaChannels.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  currency: text("currency").default("ZAR"),
  image: text("image"),
  category: text("category"),
  features: jsonb("features"),
  specifications: jsonb("specifications"),
  availability: text("availability").default("in stock"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const socialMediaCartItems = pgTable("social_media_cart_items", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => socialMediaConversations.id),
  productId: integer("product_id").notNull().references(() => socialMediaSalesProducts.id),
  quantity: integer("quantity").notNull().default(1),
  price: integer("price").notNull(),
  currency: text("currency").default("ZAR"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialMediaOrders = pgTable("social_media_orders", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => socialMediaConversations.id),
  channelId: integer("channel_id").references(() => socialMediaChannels.id),
  platform: text("platform").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("ZAR"),
  status: text("status").default("pending"),
  paymentStatus: text("payment_status").default("pending"),
  shippingAddress: jsonb("shipping_address"),
  orderItems: jsonb("order_items"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



