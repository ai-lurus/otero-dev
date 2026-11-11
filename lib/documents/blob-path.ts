import { safeFileName } from '../upload-rules'

/** Carpeta de Blob de los documentos de una empresa. */
export const documentBlobPrefix = (tenantId: string) => `documents/${tenantId}/`

/** Ruta única por archivo: la fecha y un id evitan choques entre archivos del mismo nombre en un lote. */
export const documentBlobPath = (tenantId: string, name: string, id: string) =>
  `${documentBlobPrefix(tenantId)}${Date.now()}-${id.slice(0, 8)}-${safeFileName(name)}`
