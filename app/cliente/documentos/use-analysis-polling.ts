"use client"

import { useEffect, useRef } from "react"
import { getDocumentsByIds } from "@/app/actions/documents"
import type { DocumentRow } from "@/lib/db/schema"

const POLL_MS = 4000

/** Mientras Otero lee documentos en segundo plano, consulta su estado y entrega los que ya terminaron. */
export function useAnalysisPolling(docs: DocumentRow[], onUpdate: (rows: DocumentRow[]) => void) {
  const latest = useRef({ docs, onUpdate })
  latest.current = { docs, onUpdate }
  const waiting = docs.some(d => d.analysisStatus === "analyzing")

  useEffect(() => {
    if (!waiting) return
    let stopped = false
    const tick = async () => {
      const ids = latest.current.docs.filter(d => d.analysisStatus === "analyzing").map(d => d.id)
      if (ids.length === 0) return
      try {
        const rows = await getDocumentsByIds(ids)
        if (!stopped) latest.current.onUpdate(rows.filter(r => r.analysisStatus !== "analyzing"))
      } catch {
        // Sin red por un momento: se reintenta en el siguiente ciclo.
      }
    }
    const timer = setInterval(tick, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [waiting])
}
