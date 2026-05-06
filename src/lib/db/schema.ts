import { pgTable, uuid, text, integer, bigint, timestamp, jsonb, boolean, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

export const channelEnum   = pgEnum("channel",   ["email", "whatsapp_cloud", "whatsapp_export", "whatsapp_forward", "voice", "manual"]);
export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);
export const quoteStatus   = pgEnum("quote_status", ["captured", "confirmed", "superseded", "rejected"]);
export const rfqStatus     = pgEnum("rfq_status",   ["draft", "sent", "responded", "won", "lost", "expired"]);
export const jobStatus     = pgEnum("job_status",   ["pending", "running", "completed", "failed"]);

export const org = pgTable("org", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkOrgId: text("clerk_org_id"),
  name: text("name").notNull(),
  homeCurrency: text("home_currency").notNull().default("USD"),
  homePort: text("home_port"),
  settings: jsonb("settings").$type<{ outlierThresholdPct?: number }>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqClerkOrg: uniqueIndex("org_clerk_uniq").on(t.clerkOrgId),
}));

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  clerkUserId: text("clerk_user_id"),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqEmailPerOrg: uniqueIndex("user_org_email_uniq").on(t.orgId, t.email),
  uniqClerkUser: uniqueIndex("user_clerk_uniq").on(t.clerkUserId),
}));

export const product = pgTable("product", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  defaultUnit: text("default_unit").notNull().default("kg"),
}, (t) => ({
  uniqSkuPerOrg: uniqueIndex("product_org_sku_uniq").on(t.orgId, t.sku),
}));

export const vendor = pgTable("vendor", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  name: text("name").notNull(),
  country: text("country"),
  primaryContact: text("primary_contact"),
  channelsDetected: jsonb("channels_detected").$type<string[]>().default([]),
  aliasGroup: text("alias_group"),
  scoreTier: text("score_tier"),
  manualNotes: text("manual_notes"),
  preferences: jsonb("preferences").$type<{
    preferredChannel?: "email" | "whatsapp" | "phone";
    language?: string;
    paymentTerms?: string;          // "30/70", "LC at sight", "100% advance", ...
    currency?: string;              // ISO code
    leadTimeTolerance?: number;     // days
    bestTimeToReach?: string;       // free-text
  }>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byOrg: index("vendor_org_idx").on(t.orgId),
}));

export const vendorContact = pgTable("vendor_contact", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  name: text("name").notNull(),
  role: text("role"),                                          // "Sales Manager", "Founder", etc.
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  isPrimary: boolean("is_primary").notNull().default(false),
  preferredChannel: text("preferred_channel"),                 // "email" | "whatsapp" | "phone"
  language: text("language"),                                  // "en" | "pt" | "hi" | ...
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byVendor: index("vendor_contact_vendor_idx").on(t.vendorId),
}));

export const thread = pgTable("thread", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  channel: channelEnum("channel").notNull(),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").notNull().default(0),
}, (t) => ({
  byVendor: index("thread_vendor_idx").on(t.vendorId),
}));

export const message = pgTable("message", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  threadId: uuid("thread_id").notNull().references(() => thread.id),
  channel: channelEnum("channel").notNull(),
  direction: directionEnum("direction").notNull(),
  senderName: text("sender_name"),
  senderRef: text("sender_ref"),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").notNull(),
  rawSourceRef: text("raw_source_ref"),
  classification: text("classification"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byThread: index("message_thread_idx").on(t.threadId),
  bySentAt: index("message_sent_at_idx").on(t.sentAt),
}));

export const attachment = pgTable("attachment", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => message.id),
  kind: text("kind").notNull(),
  filename: text("filename"),
  blobUrl: text("blob_url"),
  parsedText: text("parsed_text"),
  transcript: text("transcript"),
});

export const quote = pgTable("quote", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  productId: uuid("product_id").references(() => product.id),
  messageId: uuid("message_id").references(() => message.id),
  productNameRaw: text("product_name_raw"),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  unit: text("unit").notNull(),
  quantity: bigint("quantity_grams", { mode: "number" }),
  moq: bigint("moq_grams", { mode: "number" }),
  origin: text("origin"),
  packaging: text("packaging"),
  incoterm: text("incoterm"),
  destinationPort: text("destination_port"),
  leadTimeDays: integer("lead_time_days"),
  paymentTerms: text("payment_terms"),
  validityUntil: timestamp("validity_until"),
  rawExtractedJson: jsonb("raw_extracted_json"),
  confidencePerField: jsonb("confidence_per_field").$type<Record<string, number>>().default({}),
  landedCostUsdPerKg: integer("landed_cost_usd_per_kg_micros"),
  status: quoteStatus("status").notNull().default("captured"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
}, (t) => ({
  byOrgProduct: index("quote_org_product_idx").on(t.orgId, t.productId),
  byVendor: index("quote_vendor_idx").on(t.vendorId),
  byOrgCapturedAt: index("quote_org_captured_at_idx").on(t.orgId, t.capturedAt),
}));

export const rfq = pgTable("rfq", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  productId: uuid("product_id").references(() => product.id),
  productNameRaw: text("product_name_raw"),
  specJson: jsonb("spec_json").$type<Record<string, unknown>>().default({}),
  status: rfqStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const rfqRecipient = pgTable("rfq_recipient", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfqId: uuid("rfq_id").notNull().references(() => rfq.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  channel: channelEnum("channel").notNull(),
  preview: text("preview").notNull(),
  sentAt: timestamp("sent_at"),
  responseMessageId: uuid("response_message_id").references(() => message.id),
});

export const fxRateSnapshot = pgTable("fx_rate_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  base: text("base").notNull().default("USD"),
  quote: text("quote").notNull(),
  rate: integer("rate_micros").notNull(),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
}, (t) => ({
  byPair: uniqueIndex("fx_pair_uniq").on(t.base, t.quote),
}));

export const corridorAssumption = pgTable("corridor_assumption", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  origin: text("origin").notNull(),
  destinationPort: text("destination_port").notNull(),
  freightUsdPerKg: integer("freight_usd_per_kg_micros").notNull(),
  insuranceBps: integer("insurance_bps").notNull().default(50),
  dutyBps: integer("duty_bps").notNull().default(0),
}, (t) => ({
  uniq: uniqueIndex("corridor_uniq").on(t.orgId, t.origin, t.destinationPort),
}));

export const extractionJob = pgTable("extraction_job", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  kind: text("kind").notNull(),
  status: jobStatus("status").notNull().default("pending"),
  inputRef: text("input_ref"),
  progress: integer("progress").notNull().default(0),
  total: integer("total").notNull().default(0),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byOrgStatusCreated: index("extraction_job_org_status_created_idx").on(t.orgId, t.status, t.createdAt),
}));

export const eventLog = pgTable("event_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  kind: text("kind").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── New for end-to-end product ─────────────────────────────────────────────────

export const vendorScore = pgTable("vendor_score", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  priceCompetitivenessPct: integer("price_competitiveness_pct"),
  responseSpeedSeconds: integer("response_speed_seconds"),
  reliabilityProxy: integer("reliability_proxy"),
  lastComputedAt: timestamp("last_computed_at").notNull().defaultNow(),
}, (t) => ({
  uniqVendor: uniqueIndex("vendor_score_vendor_uniq").on(t.vendorId),
}));

export const rfqTemplate = pgTable("rfq_template", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  name: text("name").notNull(),
  category: text("category"),
  body: text("body").notNull(),
  specScaffold: jsonb("spec_scaffold").$type<Record<string, unknown>>().default({}),
});

export const negotiation = pgTable("negotiation", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  rfqId: uuid("rfq_id").references(() => rfq.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  targetPriceMinor: bigint("target_price_minor", { mode: "number" }),
  floorPriceMinor:  bigint("floor_price_minor",  { mode: "number" }),
  currentOfferMinor: bigint("current_offer_minor", { mode: "number" }),
  agentDraftedResponse: text("agent_drafted_response"),
  state: text("state").notNull().default("open"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const purchaseOrder = pgTable("purchase_order", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  quoteId: uuid("quote_id").references(() => quote.id),
  status: text("status").notNull().default("draft"),
  headerJson: jsonb("header_json").$type<Record<string, unknown>>().default({}),
  linesJson:  jsonb("lines_json").$type<Record<string, unknown>[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const buyOpportunity = pgTable("buy_opportunity", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  quoteId: uuid("quote_id").notNull().references(() => quote.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  productId: uuid("product_id").references(() => product.id),
  score: integer("score_micros").notNull(),
  reasoningText: text("reasoning_text"),
  counterfactualText: text("counterfactual_text"),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byOrgStatusCreated: index("buy_opportunity_org_status_created_idx").on(t.orgId, t.status, t.createdAt),
}));

export const priceForecast = pgTable("price_forecast", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  productId: uuid("product_id").notNull().references(() => product.id),
  horizonDays: integer("horizon_days").notNull().default(14),
  kind: text("kind").notNull(),
  centerMicros: bigint("center_micros", { mode: "number" }),
  bandPctMicros: integer("band_pct_micros"),
  directionalBias: text("directional_bias"),
  confidence: integer("confidence_milli"),
  modelVersion: text("model_version").notNull().default("v1"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const document = pgTable("document", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  kind: text("kind").notNull(),
  blobUrl: text("blob_url"),
  filename: text("filename"),
  visionExtractedMetadata: jsonb("vision_extracted_metadata").$type<Record<string, unknown>>().default({}),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const vendorNote = pgTable("vendor_note", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  authorUserId: uuid("author_user_id").references(() => user.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const qualityEvent = pgTable("quality_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  vendorId: uuid("vendor_id").notNull().references(() => vendor.id),
  severity: text("severity").notNull().default("low"),
  kind: text("kind").notNull(),
  description: text("description"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentPolicy = pgTable("agent_policy", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  agentName: text("agent_name").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  autoExecute: boolean("auto_execute").notNull().default(false),
  guardrails: jsonb("guardrails").$type<Record<string, number | string | boolean>>().default({}),
}, (t) => ({
  uniqPolicy: uniqueIndex("agent_policy_uniq").on(t.orgId, t.agentName),
}));

export const agentRun = pgTable("agent_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  agentName: text("agent_name").notNull(),
  inputRef: text("input_ref"),
  proposedActions: jsonb("proposed_actions"),
  decision: text("decision").notNull().default("pending"),
  actorUserId: uuid("actor_user_id").references(() => user.id),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatSession = pgTable("chat_session", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  userId: uuid("user_id").notNull().references(() => user.id),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessage = pgTable("chat_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => chatSession.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alert = pgTable("alert", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  kind: text("kind").notNull(),
  params: jsonb("params").$type<Record<string, unknown>>().notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notification = pgTable("notification", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => org.id),
  userId: uuid("user_id").references(() => user.id),
  kind: text("kind").notNull(),
  payload: jsonb("payload"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  byUserUnread: index("notification_user_unread_idx").on(t.userId, t.readAt),
  byOrgCreated: index("notification_org_created_idx").on(t.orgId, t.createdAt),
}));
