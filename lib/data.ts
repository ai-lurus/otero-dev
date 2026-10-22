import type {
  ComplianceItem,
  Service,
  ClientDocument,
  Payment,
  Message,
  Appointment,
  AdminPending,
  Client,
  ServiceTask,
  TimelineEvent,
} from './types'

export const CLIENT_NAME = ''
export const CLIENT_COMPANY = ''

// ─── CLIENT DATA ────────────────────────────────────────────────
export const compliance: ComplianceItem[] = []

export const services: Service[] = []

export const clientDocuments: ClientDocument[] = []

export const payments: Payment[] = []

export const allMessages: Message[] = []

export const appointments: Appointment[] = []

// ─── ADMIN DATA ────────────────────────────────────────────────
export const adminPending: AdminPending[] = []

export const adminClients: Client[] = []

// ─── SERVICE TASKS ─────────────────────────────────────────────
export const serviceTasks: ServiceTask[] = []

// ─── TIMELINE EVENTS ──────────────────────────────────────────
export const timelineEvents: TimelineEvent[] = []
