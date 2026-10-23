import { IngestError } from './errors'
import { decodeBody, fetchRemote, htmlToText, readCapped } from './extract'

// El certificado del DOF solo es válido para el dominio sin "www".
export const DOF_ORIGIN = 'https://dof.gob.mx'
export const DOF_HOSTS = ['dof.gob.mx', 'www.dof.gob.mx']

export type DofNote = { code: string; title: string; url: string }

/** Fecha de hoy en Ciudad de México como YYYY-MM-DD. */
export function todayInMexico(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
}

export function dofSummaryUrl(date: string): string {
  const [year, month, day] = date.split('-')
  return `${DOF_ORIGIN}/index.php?year=${year}&month=${month}&day=${day}`
}

/** El texto de cada publicación se lee desde la versión "popup", que el robots.txt del DOF no restringe. */
export function dofNoteUrl(code: string): string {
  return `${DOF_ORIGIN}/nota_detalle_popup.php?codigo=${code}`
}

export function parseDofSummary(html: string): DofNote[] {
  const notes = new Map<string, DofNote>()
  const re = /<a\s[^>]*href\s*=\s*["']([^"']*nota_detalle(?:_popup)?\.php\?[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const m of html.matchAll(re)) {
    const href = m[1].replace(/&amp;/g, '&')
    const code = href.match(/[?&]codigo=(\d+)/)?.[1]
    if (!code) continue
    const title = htmlToText(m[2]).text.replace(/\s+/g, ' ').trim().slice(0, 200)
    const existing = notes.get(code)
    // Un mismo código puede aparecer varias veces (ícono + título); se conserva el texto más largo.
    if (!existing || title.length > existing.title.length) {
      notes.set(code, { code, title: title || `Publicación DOF ${code}`, url: dofNoteUrl(code) })
    }
  }
  return [...notes.values()]
}

export async function fetchDofSummary(date: string): Promise<DofNote[]> {
  const res = await fetchRemote(dofSummaryUrl(date))
  const body = await readCapped(res.body, 5 * 1024 * 1024)
  const notes = parseDofSummary(decodeBody(body, res.headers.get('content-type') ?? ''))
  if (notes.length === 0) {
    throw new IngestError('No se encontraron publicaciones en el sumario de esa fecha (puede ser un día sin edición)')
  }
  return notes
}
