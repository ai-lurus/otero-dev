import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  primaryKey,
  unique,
  uuid,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'
import type { DetectedObject } from '@/lib/legal-objects'
import type { Triggers } from '@/lib/monitoring-profile'

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
  // URL de la base propia del cliente, cifrada (ver lib/db/tenant-crypto.ts).
  // Nula mientras sus datos sigan en la base principal.
  dbUrlEncrypted: text('db_url_encrypted'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const userTenants = pgTable('user_tenants', {
  id:        text('id').primaryKey(),
  userId:    text('userId').notNull(),
  tenantId:  text('tenantId').notNull(),
  role:      text('role').notNull().default('client'), // 'superadmin' | 'admin' (Otero) | 'tenant_admin' | 'client' (empresa cliente)
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
  objects: jsonb('objects').$type<DetectedObject[]>(), // objetos legales de la publicación, copiados al generar el asunto
  // Formato del despacho (copiado de la publicación al generar el asunto).
  objeto: text('objeto'),
  considerations: text('considerations'),
  ambito: text('ambito'), // federal | estatal | municipal
  effectiveDate: date('effective_date'),
  commentDeadline: date('comment_deadline'),
  legalBases: jsonb('legal_bases').$type<string[]>(),
  genus: text('genus'), // género ambiental G01–G17
  obligationsStatus: text('obligations_status'), // si | no | por_definir
  origin: text('origin').notNull().default('despacho'), // regwatch | despacho
  executionStatus: text('execution_status'), // por_hacer | en_curso | en_revision | cumplido; solo tras aceptar
  status: text('status').notNull().default('identificada'), // identificada | aceptada | cerrada | diferida | descartada | archivada
  owner: text('owner'),
  assigneeId: text('assignee_id'), // members.id de la persona a quien el admin del cliente asignó el asunto
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
  // Perfil de monitoreo (lib/monitoring-profile.ts): decide qué publicaciones de RegWatch le tocan.
  scian:          text('scian'), // sector (2 dígitos) o subsector (3) SCIAN
  stateList:      jsonb('stateList').$type<string[]>(), // estados donde opera
  triggers:       jsonb('triggers').$type<Triggers>(), // respuestas a las preguntas que activan materias
  materias:       jsonb('materias').$type<string[]>(), // materias que el despacho le vigila; null = todas
  confirmedAt:    timestamp('confirmedAt'), // el admin del cliente confirmó el perfil
  confirmedBy:    text('confirmedBy'),
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
  kind:         text('kind').notNull(), // 'url' | 'file' | 'site'
  title:        text('title').notNull(),
  url:          text('url'),
  blobPathname: text('blob_pathname'),
  fileName:     text('file_name'),
  mimeType:     text('mime_type'),
  sizeBytes:    integer('size_bytes'),
  status:       text('status').notNull().default('en_cola'), // en_cola | procesando | lista | error | descartada (filtro sin IA, lib/ingest/rules.ts)
  statusDetail: text('status_detail'),
  // Resultado de la categorización (Claude Haiku). Nulos hasta que status = 'lista'.
  materia:        text('materia'),
  authority:      text('authority'),
  publishedAt:    date('published_at'),
  vigenciaStatus: text('vigencia_status'), // vigente | derogada | proyecto | no_aplica | desconocida
  vigenciaDetail: text('vigencia_detail'),
  summary:        text('summary'),
  instrumentType: text('instrument_type'), // por reglas del título (lib/ingest/rules.ts)
  // Clasificación ampliada (lib/ingest/categorize.ts), con el formato del despacho.
  objeto:         text('objeto'), // qué establece, en una oración
  considerations: text('considerations'), // datos prácticos: cifras, periodos, a quién aplica
  ambito:         text('ambito'), // federal | estatal | municipal
  effectiveDate:  date('effective_date'), // entrada en vigor según transitorios
  commentDeadline: date('comment_deadline'), // fecha límite de consulta pública (PIGR o proyecto de NOM)
  isAnnouncement: boolean('is_announcement').notNull().default(false), // comunicado: noticia, no obligación
  legalBases:     jsonb('legal_bases').$type<string[]>(), // fundamentos citados: "LGEEPA art. 28"
  genus:          text('genus'), // género ambiental G01–G17 (lib/environmental-genera.ts)
  // Objetos legales detectados (lib/legal-objects.ts): [{ tipo, cita }].
  objects:        jsonb('objects').$type<DetectedObject[]>(),
  processedAt:    timestamp('processed_at'),
  // kind 'site' = sitio recurrente (p. ej. DOF); sus publicaciones son fuentes 'url' con parentId.
  parentId:       text('parent_id'),
  lastCheckedAt:  timestamp('last_checked_at'),
  // Solo sitios genéricos: comodín que deben cumplir los enlaces del listado (nulo = automático).
  linkFilter:     text('link_filter'),
  createdBy:    text('created_by').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

// A qué clientes aplica cada fuente categorizada (propuesta por reglas, ver
// lib/ingest/matching.ts). Se calcula al procesar; el socio decide después si
// genera el borrador. Vive en la principal porque la ingesta es del despacho.
export const ingestMatches = pgTable('ingest_matches', {
  sourceId:  text('source_id').notNull(),
  tenantId:  text('tenant_id').notNull(),
  applies:   boolean('applies').notNull(),
  reason:    text('reason').notNull().default(''),
  // Borrador ya generado para este cliente (id del asunto en su base), para no abrir su base al listar.
  draftItemId: text('draft_item_id'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.sourceId, t.tenantId] })])

// ── Type exports ───────────────────────────────────────────────────
export type User          = typeof user.$inferSelect
export type Tenant        = typeof tenants.$inferSelect
export type UserTenant    = typeof userTenants.$inferSelect
export type DocumentRow   = typeof documents.$inferSelect
export type Post           = typeof posts.$inferSelect
export type CompanyProfile = typeof companyProfiles.$inferSelect
export type IngestSource   = typeof ingestSources.$inferSelect
