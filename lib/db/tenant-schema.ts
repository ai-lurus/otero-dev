// Tablas que viven en la base propia de cada cliente (tenant). La base
// principal conserva usuarios, tenants, membresías, posts e ingesta (de Otero).
// `tenants` va también aquí solo porque company_profiles la referencia; en la
// base del cliente tiene una fila (el propio cliente) y db_url_encrypted nulo.
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
