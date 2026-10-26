// Tablas que viven en la base propia de cada cliente (tenant). La base
// principal conserva usuarios, tenants, membresías, posts e ingesta (de Otero).
// `tenants` va también aquí solo porque company_profiles la referencia; en la
// base del cliente tiene una fila (el propio cliente) y db_url_encrypted nulo.
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Personas de la empresa cliente. La identidad (correo, contraseña, sesiones)
// vive en la base principal; mainUserId apunta a ese usuario, sin llave
// foránea porque son bases distintas. No se borran: al dar de baja se marca
// active = false para conservar quién hizo qué.
export const members = pgTable('members', {
  id:         text('id').primaryKey(),
  mainUserId: text('main_user_id').notNull().unique(),
  name:       text('name').notNull(),
  position:   text('position'),
  role:       text('role').notNull().default('member'), // rol dentro de la empresa
  active:     boolean('active').notNull().default(true),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
})

export {
  tenants,
  documents,
  regulatoryItems,
  regulatoryItemEvents,
  regulatoryItemEvidence,
  certifications,
  companyProfiles,
  services,
  payments,
  appointments,
} from './schema'
