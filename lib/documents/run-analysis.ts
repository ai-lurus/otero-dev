import { get } from '@vercel/blob'
import { and, eq } from 'drizzle-orm'
import { getTenantDb } from '../db/tenant'
import { documents } from '../db/schema'
import { analyzeDocument } from './analyze'

// Lee un documento ya subido a Blob y guarda lo detectado. Corre en segundo plano
// (after() de la ruta de registro), así la subida no espera a Haiku. Nunca lanza.

export async function analyzeStoredDocument(tenantId: string, docId: string): Promise<void> {
  const db = await getTenantDb(tenantId)
  const settle = async (analysis: Awaited<ReturnType<typeof analyzeDocument>>) => {
    // Solo si sigue "analizando": si el cliente ya lo completó a mano, no se pisa.
    await db
      .update(documents)
      .set({ analysis, analysisStatus: analysis ? 'detected' : 'none' })
      .where(and(eq(documents.id, docId), eq(documents.tenantId, tenantId), eq(documents.analysisStatus, 'analyzing')))
  }
  try {
    const [doc] = await db
      .select({ name: documents.name, blobPathname: documents.blobPathname })
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.tenantId, tenantId)))
      .limit(1)
    if (!doc?.blobPathname) return settle(null)
    const blob = await get(doc.blobPathname, { access: 'private' })
    if (!blob || blob.statusCode !== 200) return settle(null)
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer())
    await settle(await analyzeDocument(bytes, blob.blob.contentType, doc.name))
  } catch (error) {
    console.error('[documents] lectura en segundo plano falló', docId, error)
    await settle(null).catch(() => {})
  }
}

