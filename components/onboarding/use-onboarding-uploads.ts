'use client'

import { useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import type { DocumentRow } from '@/lib/db/schema'
import { documentBlobPath } from '@/lib/documents/blob-path'
import { UPLOAD_CONCURRENCY, pickBatchFiles, runPool } from '@/lib/documents/batch'

// Subida de documentos dentro del alta. Mismo camino que Documentos: el archivo
// va directo a Blob, /api/upload lo registra y Otero lo lee en segundo plano.

export type UploadItem = {
  key: string
  name: string
  size: number
  status: 'queued' | 'uploading' | 'registering' | 'done' | 'error'
  error?: string
}

const CATEGORY = 'General'
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'file')
const sizeOf = (bytes: number) => (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)

export function useOnboardingUploads(tenantId: string, onUpsert: (doc: DocumentRow) => void) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([])
  const files = useRef(new Map<string, File>())
  const count = useRef(0)
  const alive = useRef(true)

  const patch = (key: string, change: Partial<UploadItem>) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...change } : i)))

  async function uploadOne(key: string) {
    const file = files.current.get(key)
    if (!file || !alive.current) return
    patch(key, { status: 'uploading', error: undefined })
    try {
      const blob = await upload(documentBlobPath(tenantId, file.name, key), file, {
        access: 'private',
        handleUploadUrl: '/api/upload/token',
        contentType: file.type,
        multipart: file.size > 8 * 1024 * 1024,
      })
      patch(key, { status: 'registering' })
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pathname: blob.pathname, name: file.name, category: CATEGORY }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo subir')
      const data = await res.json()
      patch(key, { status: 'done' })
      const now = new Date()
      onUpsert({
        id: data.docId, tenantId, name: file.name, type: extOf(file.name), category: CATEGORY, service: null,
        status: 'vigente', size: data.size ?? sizeOf(file.size), uploadedAt: now, expiresAt: null,
        requiresSignature: false, signed: false, blobUrl: null, blobPathname: data.pathname,
        analysis: null, analysisStatus: data.analysisStatus ?? 'none', analysisConfirmedAt: null, createdAt: now,
      })
    } catch (e) {
      patch(key, { status: 'error', error: e instanceof Error ? e.message : 'No se pudo subir' })
    }
  }

  async function run(keys: string[]) {
    await runPool(keys, UPLOAD_CONCURRENCY, uploadOne)
  }

  function add(list: FileList | File[]) {
    const { accepted, rejected: bad } = pickBatchFiles(Array.from(list), count.current)
    setRejected(bad)
    const fresh = accepted.map(file => {
      const key = crypto.randomUUID()
      files.current.set(key, file)
      return { key, name: file.name, size: file.size, status: 'queued' as const }
    })
    if (fresh.length === 0) return
    count.current += fresh.length
    setItems(prev => [...prev, ...fresh])
    void run(fresh.map(f => f.key))
  }

  const retry = (key: string) => void run([key])
  const busy = items.some(i => i.status === 'queued' || i.status === 'uploading' || i.status === 'registering')

  return { items, rejected, add, retry, busy }
}
