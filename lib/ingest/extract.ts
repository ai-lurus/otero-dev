import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { get } from '@vercel/blob'

// Límites pensados para el plan free de Vercel (funciones de hasta 60 s).
const FETCH_TIMEOUT_MS = 15_000
const MAX_REMOTE_BYTES = 15 * 1024 * 1024
const MAX_TEXT_CHARS = 60_000
const MAX_BLOB_BYTES = 18 * 1024 * 1024
const MAX_REDIRECTS = 3

export type Content =
  | { kind: 'text'; text: string; title?: string }
  | { kind: 'pdf'; base64: string }
  | { kind: 'image'; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }

/** Error con mensaje apto para mostrarse al usuario. */
export class IngestError extends Error {}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    if (v === '::1' || v === '::' || v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  )
}

async function assertPublicHost(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new IngestError('Solo se pueden leer enlaces http o https')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map(a => a.address)
  if (addresses.length === 0) throw new IngestError('No se pudo resolver el dominio del enlace')
  if (addresses.some(isPrivateAddress)) throw new IngestError('El enlace apunta a una dirección interna y no se puede leer')
}

async function fetchRemote(startUrl: string): Promise<Response> {
  let url = new URL(startUrl)
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublicHost(url)
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OteroBot/1.0)', Accept: 'text/html,application/pdf,text/plain;q=0.9,*/*;q=0.5' },
    }).catch(() => { throw new IngestError('No se pudo descargar el enlace (sin respuesta a tiempo)') })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url)
      continue
    }
    if (!res.ok) throw new IngestError(`El sitio respondió con error ${res.status}`)
    return res
  }
  throw new IngestError('El enlace tiene demasiadas redirecciones')
}

async function readCapped(stream: ReadableStream<Uint8Array> | null, max: number): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > max) {
      await reader.cancel()
      throw new IngestError('El contenido es demasiado grande para procesarlo')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function htmlToText(html: string): { text: string; title?: string } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const text = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|br|section|article)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, title: title ? htmlToText(title).text.slice(0, 200) : undefined }
}

export async function extractFromUrl(url: string): Promise<Content> {
  const res = await fetchRemote(url)
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > MAX_REMOTE_BYTES) throw new IngestError('El contenido es demasiado grande para procesarlo')
  const body = await readCapped(res.body, MAX_REMOTE_BYTES)

  if (type === 'application/pdf') return { kind: 'pdf', base64: body.toString('base64') }
  if (type === 'text/html' || type === 'application/xhtml+xml' || type === '') {
    const { text, title } = htmlToText(body.toString('utf8'))
    if (text.length < 200) throw new IngestError('La página casi no tiene texto legible (puede requerir JavaScript o inicio de sesión)')
    return { kind: 'text', text: text.slice(0, MAX_TEXT_CHARS), title }
  }
  if (type.startsWith('text/')) return { kind: 'text', text: body.toString('utf8').slice(0, MAX_TEXT_CHARS) }
  throw new IngestError(`Tipo de contenido no soportado todavía (${type})`)
}

export async function extractFromBlob(pathname: string, mimeType: string | null): Promise<Content> {
  const result = await get(pathname, { access: 'private' })
  if (!result || result.statusCode !== 200) throw new IngestError('No se encontró el archivo en el almacenamiento')
  const body = await readCapped(result.stream, MAX_BLOB_BYTES)
  const type = mimeType ?? result.blob.contentType ?? ''

  if (type === 'application/pdf') return { kind: 'pdf', base64: body.toString('base64') }
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') {
    if (body.byteLength > 5 * 1024 * 1024) throw new IngestError('La imagen pesa más de 5 MB; reduce su tamaño para procesarla')
    return { kind: 'image', base64: body.toString('base64'), mediaType: type }
  }
  if (type === 'text/plain' || type === 'text/csv') return { kind: 'text', text: body.toString('utf8').slice(0, MAX_TEXT_CHARS) }
  throw new IngestError('Este formato (Word, Excel o HEIC) aún no se puede categorizar; conviértelo a PDF')
}
