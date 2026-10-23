import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'

// ── Better Auth required tables ────────────────────────────────────

export const user = pgTable('user', {
  id:            text('id').primaryKey(),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('createdAt').notNull().defaultNow(),
  updatedAt:     timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id:         text('id').primaryKey(),
  expiresAt:  timestamp('expiresAt').notNull(),
  token:      text('token').notNull().unique(),
  createdAt:  timestamp('createdAt').notNull().defaultNow(),
  updatedAt:  timestamp('updatedAt').notNull().defaultNow(),
  ipAddress:  text('ipAddress'),
  userAgent:  text('userAgent'),
  userId:     text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id:                     text('id').primaryKey(),
  accountId:              text('accountId').notNull(),
  providerId:             text('providerId').notNull(),
  userId:                 text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken:            text('accessToken'),
  refreshToken:           text('refreshToken'),
  idToken:                text('idToken'),
  accessTokenExpiresAt:   timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt:  timestamp('refreshTokenExpiresAt'),
  scope:                  text('scope'),
  password:               text('password'),
  createdAt:              timestamp('createdAt').notNull().defaultNow(),
  updatedAt:              timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expiresAt').notNull(),
  createdAt:  timestamp('createdAt').defaultNow(),
  updatedAt:  timestamp('updatedAt').defaultNow(),
})

// ── App tables ─────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  slug:      text('slug').unique(),
  rfc:       text('rfc'),
  industry:  text('industry'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const userTenants = pgTable('user_tenants', {
  id:        text('id').primaryKey(),
  userId:    text('userId').notNull(),
  tenantId:  text('tenantId').notNull(),
  role:      text('role').notNull().default('client'), // 'superadmin' | 'admin' | 'client'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.tenantId)])

export const documents = pgTable('documents', {
  id:                text('id').primaryKey(),
  tenantId:          text('tenantId').notNull(),
  name:              text('name').notNull(),
  type:              text('type').notNull().default('pdf'),
  category:          text('category').notNull(),
  service:           text('service'),
  status:            text('status').notNull().default('vigente'),
  size:              text('size'),
  uploadedAt:        timestamp('uploadedAt').notNull().defaultNow(),
  expiresAt:         date('expiresAt'),
  requiresSignature: boolean('requiresSignature').notNull().default(false),
  signed:            boolean('signed').notNull().default(false),
  blobUrl:           text('blobUrl'),
  blobPathname:      text('blobPathname'),
  createdAt:         timestamp('createdAt').notNull().defaultNow(),
})

export const posts = pgTable('posts', {
  id:          text('id').primaryKey(),
  title:       text('title').notNull(),
  body:        text('body').notNull(),
  summary:     text('summary').notNull().default(''),
  category:    text('category').notNull().default('regulatorio'),
  priority:    text('priority').notNull().default('media'),
  published:   boolean('published').notNull().default(false),
  authorId:    text('authorId').references(() => user.id, { onDelete: 'set null' }),
  affectsNote: text('affectsNote'),
  source:      text('source').notNull().default('DOF'),
  createdAt:   timestamp('createdAt').notNull().defaultNow(),
  updatedAt:   timestamp('updatedAt').notNull().defaultNow(),
})

export const regulatoryItems = pgTable('regulatory_items', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  scope: text('scope').notNull().default('regulatorio'), // 'regulatorio' | 'legislativo'
  materia: text('materia').notNull().default('Administrativo y simplificación'),
  subtema: text('subtema'),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  instrumentType: text('instrument_type'),
  authority: text('authority'),
  source: text('source').notNull(),
  sourceUrl: text('source_url'),
  stage: text('stage'),
  stageDetail: text('stage_detail'),
  publishedAt: date('published_at'),
  dueDate: date('due_date'),
  impact: text('impact'), // 'alto' | 'medio' | 'bajo'
  impactDirection: text('impact_direction'),
  impactRationale: text('impact_rationale').notNull().default(''),
  generatesObligation: boolean('generates_obligation').notNull().default(false),
  obligationDetail: text('obligation_detail').notNull().default(''),
  comments: text('comments').notNull().default(''),
  status: text('status').notNull().default('identificada'), // identificada | aceptada | cerrada | diferida
  owner: text('owner'),
  sentAt: timestamp('sent_at'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const regulatoryItemEvents = pgTable('regulatory_item_events', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  metadata: jsonb('metadata').notNull().default({}),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const regulatoryItemEvidence = pgTable('regulatory_item_evidence', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  kind: text('kind').notNull().default('nota'),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  url: text('url'),
  blobPathname: text('blob_pathname'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const certifications = pgTable('certifications', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  issuer: text('issuer').notNull().default(''),
  status: text('status').notNull().default('vigente'),
  issuedAt: date('issued_at'),
  expiresAt: date('expires_at'),
  owner: text('owner'),
  notes: text('notes').notNull().default(''),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const companyProfiles = pgTable('company_profiles', {
  tenantId:       text('tenantId').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  description:    text('description').notNull().default(''),
  industry:       text('industry').notNull().default(''),
  employees:      text('employees').notNull().default(''),
  states:         text('states').notNull().default(''),
  activities:     text('activities').notNull().default(''),
  certifications: text('certifications').notNull().default(''),
  riesgos:        text('riesgos').notNull().default(''),
  updatedAt:      timestamp('updatedAt').notNull().defaultNow(),
})

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenantId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  startDate: date('startDate'),
  endDate: date('endDate'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenantId').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
  currency: text('currency').notNull().default('MXN'),
  status: text('status').notNull().default('pending'),
  dueDate: date('dueDate'),
  paidAt: timestamp('paidAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenantId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startsAt: timestamp('startsAt').notNull(),
  endsAt: timestamp('endsAt'),
  status: text('status').notNull().default('scheduled'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Fuentes que el despacho agrega para ingesta (URLs o archivos). La
// categorización llega después; por ahora solo se guardan con su estado.
export const ingestSources = pgTable('ingest_sources', {
  id:           text('id').primaryKey(),
  kind:         text('kind').notNull(), // 'url' | 'file'
  title:        text('title').notNull(),
  url:          text('url'),
  blobPathname: text('blob_pathname'),
  fileName:     text('file_name'),
  mimeType:     text('mime_type'),
  sizeBytes:    integer('size_bytes'),
  status:       text('status').notNull().default('en_cola'), // en_cola | procesando | lista | error
  statusDetail: text('status_detail'),
  createdBy:    text('created_by').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

// ── Type exports ───────────────────────────────────────────────────
export type User          = typeof user.$inferSelect
export type Tenant        = typeof tenants.$inferSelect
export type UserTenant    = typeof userTenants.$inferSelect
export type DocumentRow   = typeof documents.$inferSelect
export type Post           = typeof posts.$inferSelect
export type CompanyProfile = typeof companyProfiles.$inferSelect
export type IngestSource   = typeof ingestSources.$inferSelect
