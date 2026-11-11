import { ALLOWED_UPLOAD_TYPES, MAX_DOCUMENT_BYTES } from '../upload-rules'
import type { DocAnalysis } from './analysis'

// Reglas de la carga por lote. Viven aparte para que el navegador y el servidor
// usen los mismos topes y para poder probarlas sin red.

/** Archivos por lote: cubre una planta completa sin dejar que un lote se vuelva ilimitado. */
export const MAX_BATCH_FILES = 30
/** Subidas simultáneas desde el navegador. */
export const UPLOAD_CONCURRENCY = 3
/** Documentos que se analizan con IA por empresa en 24 horas; pasado el tope, el archivo se guarda sin análisis. */
export const DAILY_ANALYSIS_LIMIT = 100

export type PickedFiles<T> = { accepted: T[]; rejected: { name: string; reason: string }[] }

type FileLike = { name: string; size: number; type: string }

/** Separa lo que cabe en el lote de lo que se rechaza, con el motivo en español. */
export function pickBatchFiles<T extends FileLike>(files: T[], alreadyQueued = 0): PickedFiles<T> {
  const accepted: T[] = []
  const rejected: { name: string; reason: string }[] = []
  for (const file of files) {
    if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) {
      rejected.push({ name: file.name, reason: 'Pesa más de 50 MB o está vacío' })
    } else if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      rejected.push({ name: file.name, reason: 'Formato no permitido' })
    } else if (alreadyQueued + accepted.length >= MAX_BATCH_FILES) {
      rejected.push({ name: file.name, reason: `El lote admite hasta ${MAX_BATCH_FILES} archivos` })
    } else {
      accepted.push(file)
    }
  }
  return { accepted, rejected }
}

/** Corre `worker` sobre cada elemento con a lo más `limit` en vuelo. Un error no detiene al resto. */
export async function runPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0
  const lane = async () => {
    while (next < items.length) {
      const index = next++
      try {
        await worker(items[index], index)
      } catch {
        // El worker reporta su propio error; el lote sigue.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, lane))
}

/** Alta confianza: Otero identificó tipo, autoridad, materia y estado; no hay nada que adivinar. */
export function isHighConfidence(a: DocAnalysis | null | undefined): boolean {
  return Boolean(a && a.tipo !== 'otro' && a.autoridad && a.materia !== 'otra' && a.estado !== 'desconocido')
}

/** Cuántos documentos más se pueden analizar hoy dado lo ya subido en 24 h. */
export function analysisRoom(uploadedLast24h: number, limit = DAILY_ANALYSIS_LIMIT): number {
  return Math.max(0, limit - uploadedLast24h)
}
