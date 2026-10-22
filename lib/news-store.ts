import { useSyncExternalStore } from "react"
import type { NewsItem } from "@/lib/types"

const STORAGE_KEY = "compliax-news-v1"

const SEED_NEWS: NewsItem[] = [
  {
    id: "n1",
    title:
      "PROFEPA intensifica verificaciones en corredores industriales del Valle de México a partir de mayo",
    summary:
      "240 visitas de inspección programadas para Q2 2025 en Vallejo, Xalostoc y Cuautitlán Izcalli. Empresas con certificado de emisiones vencido podrían recibir medidas de seguridad inmediata.",
    body:
      "La Procuraduría Federal de Protección al Ambiente comunicó el inicio del Programa de Verificación Industrial 2025, que contempla 240 visitas en los principales corredores industriales de la Zona Metropolitana del Valle de México. Las inspecciones se enfocarán en el cumplimiento de NOMs de emisiones a la atmósfera, manejo de residuos peligrosos y condiciones de operación de equipos de combustión.\n\nLas empresas detectadas sin certificado vigente o con incumplimientos en sus condicionantes de Licencia Ambiental serán sujetas a medidas de seguridad que pueden incluir sellos de clausura parcial o total. Se recomienda realizar una auditoría interna preventiva antes del 15 de mayo.",
    priority: "alta",
    category: "ambiental",
    source: "PROFEPA",
    firm: "paulsen",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    affectsClients: "4 clientes con instalaciones industriales en ZMVM",
    suggestedActions: [
      "Auditoría interna de condicionantes de Licencia Ambiental",
      "Verificar vigencia de certificados PROFEPA",
      "Actualizar registros de monitoreo de emisiones",
    ],
  },
  {
    id: "n2",
    title: "SEMARNAT endurece requisitos para Licencias Ambientales de Operación industrial en 2025",
    summary:
      "Nueva circular técnica CT-12/2025 exige monitoreo continuo de emisiones para plantas en Zonas Metropolitanas. Periodo de adaptación 90 días. Sanciones hasta 8% de la inversión total.",
    body:
      "La nueva circular técnica CT-12/2025 establece que toda Licencia Ambiental de Operación para instalaciones industriales en Zonas Metropolitanas deberá incluir un sistema de monitoreo continuo de emisiones en chimeneas principales. Se incorporan evaluaciones obligatorias de dispersión de contaminantes y un plan de reducción progresiva conforme a los compromisos del Programa de Gestión de Calidad del Aire.\n\nLas instalaciones en proceso de renovación cuentan con 90 días para adecuar su expediente técnico. Las que no cumplan en plazo deberán iniciar un nuevo trámite bajo la normatividad vigente.",
    priority: "alta",
    category: "ambiental",
    source: "SEMARNAT",
    firm: "paulsen",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    affectsClients: "3 clientes con renovaciones de LAO en trámite",
    suggestedActions: [
      "Revisar condicionantes de LAO en expedientes en trámite",
      "Programar instalación de sistemas de monitoreo continuo",
      "Actualizar memoria técnica capítulo de emisiones",
    ],
  },
  {
    id: "n3",
    title: "Iniciativa de reforma laboral aumenta días de vacaciones desde el primer año",
    summary:
      "Turnada a comisiones. Probabilidad alta de aprobación. Aún no es ley pero conviene preparar políticas internas.",
    body:
      "Diputados turnaron a la Comisión de Trabajo una iniciativa que incrementaría a 15 días el periodo vacacional inicial para trabajadores. La probabilidad de aprobación es alta dado el respaldo del oficialismo.\n\nRecomendamos preparar la actualización de políticas internas y comunicación con el personal con anticipación, para evitar fricciones cuando entre en vigor.",
    priority: "media",
    category: "laboral",
    source: "Cámara de Diputados",
    firm: "mia",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    affectsClients: "Todos los clientes con personal en nómina",
    suggestedActions: [
      "Revisar y actualizar reglamento interior de trabajo",
      "Modelar impacto presupuestal de días adicionales",
      "Preparar comunicación interna",
    ],
  },
  {
    id: "n4",
    title: "Nuevos umbrales de notificación de concentraciones ante COFECE",
    summary:
      "COFECE actualizó montos que disparan obligación de notificación previa en operaciones M&A.",
    body:
      "La Comisión Federal de Competencia Económica publicó la actualización anual de los umbrales para notificación de concentraciones. Los nuevos montos están vigentes a partir del próximo trimestre y aplican tanto a operaciones nacionales como internacionales con efectos en México.",
    priority: "baja",
    category: "regulatorio",
    source: "COFECE",
    firm: "mia",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    affectsClients: "Operaciones M&A programadas",
    suggestedActions: ["Validar umbrales en operaciones en curso"],
  },
  {
    id: "n5",
    title: "SAT amplía facilidades para devoluciones de IVA en sector exportador",
    summary:
      "Nueva resolución miscelánea reduce tiempos de respuesta a 20 días hábiles para contribuyentes certificados.",
    body:
      "Con la entrada en vigor de la Quinta Resolución de Modificaciones a la Resolución Miscelánea Fiscal, los contribuyentes certificados del sector exportador podrán obtener devoluciones de IVA en plazos significativamente menores. Esta es una buena oportunidad para acelerar flujo de caja.",
    priority: "baja",
    category: "fiscal",
    source: "SAT",
    firm: "mia",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    affectsClients: "Clientes exportadores certificados",
    suggestedActions: [
      "Verificar estatus de certificación",
      "Programar solicitudes pendientes",
    ],
  },
]

let state: NewsItem[] = SEED_NEWS
let initialized = false
const listeners = new Set<() => void>()

function loadFromStorage() {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as NewsItem[]
      if (Array.isArray(parsed)) state = parsed
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NEWS))
    }
  } catch {
    state = SEED_NEWS
  }
  initialized = true
}

function saveToStorage() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function emit() {
  for (const l of listeners) l()
}

function ensureInitialized() {
  if (!initialized && typeof window !== "undefined") loadFromStorage()
}

function subscribe(listener: () => void) {
  ensureInitialized()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): NewsItem[] {
  ensureInitialized()
  return state
}

function getServerSnapshot(): NewsItem[] {
  return SEED_NEWS
}

export function useNews(): NewsItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function addNews(item: Omit<NewsItem, "id" | "publishedAt"> & { publishedAt?: string }) {
  ensureInitialized()
  const created: NewsItem = {
    ...item,
    id: `n${Date.now()}`,
    publishedAt: item.publishedAt ?? new Date().toISOString(),
  }
  state = [created, ...state]
  saveToStorage()
  emit()
  return created
}

export function updateNews(id: string, patch: Partial<Omit<NewsItem, "id">>) {
  ensureInitialized()
  state = state.map((n) => (n.id === id ? { ...n, ...patch } : n))
  saveToStorage()
  emit()
}

export function deleteNews(id: string) {
  ensureInitialized()
  state = state.filter((n) => n.id !== id)
  saveToStorage()
  emit()
}

export function resetNews() {
  state = SEED_NEWS
  saveToStorage()
  emit()
}
