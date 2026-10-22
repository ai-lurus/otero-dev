export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

export function safeFileName(name: string) {
  return name.normalize('NFKD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').slice(-120) || 'archivo'
}
