"use client"

export type DocCategory = "permiso" | "fiscal" | "contrato" | "tramite" | "corporativo" | "laboral"
export type FileType = "pdf" | "word" | "image" | "other"

export interface ObligationDoc {
  id: string
  name: string
  fileName: string
  fileType: FileType
  fileSize: string
  category: DocCategory
  status: "vigente" | "por_vencer" | "vencido" | "archivado" | "sin_vencimiento"
  expiresAt: string | null
  noExpiry: boolean
  sede: string
  responsable: string | null
  uploadedAt: string
  uploadedBy: string
  area: "ambiental" | "corporativo"
  daysLeft: number
}

export const SEDES = ["Corporativo", "Planta Vallejo Norte", "Torre Reforma"]
export const RESPONSABLES = ["Sin asignar", "Mariana López", "Carlos Hernández", "Ana Torres"]
export const CATEGORY_LABELS: Record<DocCategory, string> = {
  permiso: "Permiso",
  fiscal: "Fiscal",
  contrato: "Contrato",
  tramite: "Trámite",
  corporativo: "Corporativo",
  laboral: "Laboral",
}

export function fileTypeFromName(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return "pdf"
  if (["doc", "docx"].includes(ext)) return "word"
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image"
  return "other"
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const documents: ObligationDoc[] = []

export function findDuplicate(name: string, sede: string) {
  const normalized = (value: string) => value.trim().toLowerCase()
  return documents.find((doc) => doc.name && normalized(doc.name) === normalized(name) && normalized(doc.sede) === normalized(sede)) ?? null
}

export function addDoc(input: Omit<ObligationDoc, "id" | "daysLeft" | "status" | "uploadedAt">) {
  const doc: ObligationDoc = {
    ...input,
    id: crypto.randomUUID(),
    status: input.noExpiry ? "sin_vencimiento" : "vigente",
    daysLeft: input.noExpiry ? 9999 : 0,
    uploadedAt: new Date().toISOString(),
  }
  documents.unshift(doc)
  return doc
}

export function renewDoc(_oldDocId: string, input: Omit<ObligationDoc, "id" | "daysLeft" | "status" | "uploadedAt">) {
  return addDoc(input)
}
