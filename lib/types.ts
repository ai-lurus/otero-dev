export type Firm = "paulsen" | "mia"

export type ServiceStatus = "solicitud" | "en_proceso" | "revision" | "completado" | "cancelado"
export type ComplianceStatus = "vigente" | "por_vencer" | "vencido"
export type PaymentStatus = "pendiente" | "pagado" | "vencido"
export type Priority = "alta" | "media" | "baja"

export interface ComplianceItem {
  id: string
  name: string
  category: "permiso" | "fiscal" | "contrato" | "tramite"
  status: ComplianceStatus
  expiresAt: string
  daysLeft: number
  firm: Firm
  aiTip?: string
}

export interface Service {
  id: string
  title: string
  category: string
  status: ServiceStatus
  firm: Firm
  createdAt: string
  updatedAt: string
  nextStep: string
  progress: number
  assignedTo: string
  description?: string
}

export interface ClientDocument {
  id: string
  name: string
  direction: "recibido" | "enviado" | "pendiente_firma"
  firm: Firm
  serviceId?: string
  createdAt: string
  size: string
  signed?: boolean
  blobPathname?: string
}

export interface Payment {
  id: string
  concept: string
  amount: number
  status: PaymentStatus
  firm: Firm
  dueDate: string
  paidAt?: string
  serviceId?: string
}

export interface Message {
  id: string
  from: "client" | "firm"
  senderName: string
  content: string
  timestamp: string
  read: boolean
  firm: Firm
  serviceId: string
}

export interface Appointment {
  id: string
  date: string
  time: string
  type: string
  firm: Firm
  status: "confirmada" | "pendiente" | "cancelada"
  attorney: string
  notes?: string
}

export interface AdminPending {
  id: string
  type: "mensaje" | "documento" | "servicio" | "pago" | "cita"
  client: string
  clientId: string
  summary: string
  priority: Priority
  firm: Firm
  createdAt: string
  read: boolean
}

export interface Client {
  id: string
  name: string
  company: string
  email: string
  phone: string
  firms: Firm[]
  activeServices: number
  pendingPayments: number
  lastActivity: string
}

export interface ServiceTask {
  id: string
  serviceId: string
  title: string
  status: "pendiente" | "en_progreso" | "completada"
  assignedTo: string
  dueDate?: string
  note?: string
}

export interface TimelineEvent {
  id: string
  serviceId: string
  date: string
  actor: string
  firm: Firm
  action: string
  detail?: string
}

export type NewsPriority = "alta" | "media" | "baja"
export type NewsCategory =
  | "ambiental"
  | "fiscal"
  | "regulatorio"
  | "corporativo"
  | "laboral"
  | "iniciativa"

export interface NewsItem {
  id: string
  title: string
  summary: string
  body: string
  priority: NewsPriority
  category: NewsCategory
  source: string
  firm: Firm
  publishedAt: string
  image?: string
  affectsClients?: string
  suggestedActions?: string[]
}

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  ambiental: "Ambiental",
  fiscal: "Fiscal",
  regulatorio: "Regulatorio",
  corporativo: "Corporativo",
  laboral: "Laboral",
  iniciativa: "Iniciativa",
}

export const NEWS_PRIORITY_LABELS: Record<NewsPriority, string> = {
  alta: "Acción requerida",
  media: "Anticipación",
  baja: "Informativo",
}

export const SERVICE_CATALOG = [
  { id: "eia", label: "Estudio de Impacto Ambiental", firm: "paulsen" as Firm, category: "Ambiental" },
  { id: "permiso_uso", label: "Permiso de Uso de Suelo", firm: "paulsen" as Firm, category: "Regulatorio" },
  { id: "licencia_ambiental", label: "Licencia Ambiental", firm: "paulsen" as Firm, category: "Ambiental" },
  { id: "noc", label: "Certificado de No Objeción", firm: "paulsen" as Firm, category: "Regulatorio" },
  { id: "constitucion", label: "Constitución de Sociedad", firm: "mia" as Firm, category: "Corporativo" },
  { id: "contrato", label: "Elaboración de Contratos", firm: "mia" as Firm, category: "Corporativo" },
  { id: "litigio", label: "Representación en Litigio", firm: "mia" as Firm, category: "Litigio" },
  { id: "due_diligence", label: "Due Diligence Jurídico", firm: "mia" as Firm, category: "Corporativo" },
  { id: "pi", label: "Registro de Propiedad Intelectual", firm: "mia" as Firm, category: "PI" },
]
