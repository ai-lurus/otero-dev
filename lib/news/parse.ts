import { htmlToText } from '@/lib/ingest/extract'
import { decodeEntities } from '@/lib/ingest/title'
import type { Materia } from '@/lib/ingest/categories'

// Lectura de salas de prensa sin IA: listados de gob.mx (que traen fecha,
// título e imagen por nota) y la entrada de cada nota para el boletín.

export type ListedNote = { url: string; title: string; publishedAt: Date | null; imageUrl: string | null }

const SUMMARY_MAX = 420
const MIN_SUMMARY = 60

/** "2026-11-03 14:01:00" de gob.mx, en hora de CDMX (UTC-6). */
export function parseGobMxDate(value: string | undefined): Date | null {
  const m = value?.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?/)
  if (!m) return null
  const date = new Date(`${m[1]}T${m[2] ?? '12:00'}:00-06:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const clean = (s: string) => decodeEntities(s).replace(/\s+/g, ' ').trim()

/** Listado /archivo/prensa de gob.mx: un <article> por nota con <time>, <h2> y el enlace "Continuar leyendo". */
export function parseGobMxListing(html: string, base: URL): ListedNote[] {
  const out: ListedNote[] = []
  for (const [block] of html.matchAll(/<article\b[\s\S]*?<\/article>/gi)) {
    const href = block.match(/<a\b[^>]*href="([^"]+)"/i)?.[1]
    if (!href) continue
    const title = clean(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]+>/g, ' ') ?? block.match(/aria-label="([^"]+)"/i)?.[1] ?? '')
    if (title.length < 10) continue
    const img = block.match(/<img\b[^>]*src="(https?:[^"]+)"/i)?.[1] ?? null
    try {
      const url = new URL(decodeEntities(href), base)
      url.hash = ''
      out.push({
        url: url.toString(),
        title: title.slice(0, 300),
        publishedAt: parseGobMxDate(block.match(/<time[^>]*datetime="([^"]+)"/i)?.[1]),
        imageUrl: img && !/missing-photo/.test(img) ? img : null,
      })
    } catch { /* enlace inválido */ }
  }
  return out
}

const meta = (html: string, key: string) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1]
  return content ? clean(content) : null
}

/** Recorta en la última oración (o palabra) que cabe en el máximo. */
export function trimSummary(text: string, max = SUMMARY_MAX): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sentence = cut.lastIndexOf('. ')
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

/**
 * Entrada de la nota: en gob.mx los primeros párrafos del cuerpo; en otros
 * sitios la descripción de la página. También fecha e imagen si las declara.
 */
export function parseArticle(html: string): { summary: string | null; publishedAt: Date | null; imageUrl: string | null } {
  const bodyStart = html.search(/class="(article-body|post-content)[ "]/i)
  let summary: string | null = null
  if (bodyStart >= 0) {
    const text = htmlToText(html.slice(bodyStart, bodyStart + 20_000).replace(/^[^>]*>/, '')).text
    const paragraphs = text.split('\n').map(p => p.trim()).filter(p => p.length > 40)
    if (paragraphs.length) summary = trimSummary(paragraphs.slice(0, 3).join(' '))
  }
  const description = meta(html, 'og:description') ?? meta(html, 'description')
  if (!summary && description && description.length >= MIN_SUMMARY) summary = trimSummary(description)

  const published = meta(html, 'article:published_time') ?? html.match(/"datePublished":"([^"]+)"/)?.[1] ?? null
  const publishedAt = published ? new Date(published) : null
  const image = meta(html, 'og:image')
  return {
    summary,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    imageUrl: image && /^https?:/.test(image) ? image : null,
  }
}

// Palabras que delatan la materia de una nota cuando la fuente no la fija.
const KEYWORDS: [Materia, RegExp][] = [
  ['fiscal', /\b(impuesto|fiscal|tributari|iva|isr|ieps|contribuyente|factura|cfdi|recaudaci)/i],
  ['laboral', /\b(laboral|trabajador|salario|imss|infonavit|empleo|sindica|jornada)/i],
  ['comercio_exterior', /\b(aduan|arancel|exportaci|importaci|comercio exterior|t-mec|tratado comercial)/i],
  ['ambiental', /\b(ambiental|residuo|emisi[oó]n|contaminaci|cambio clim|biodiversidad|forestal|semarnat|profepa)/i],
  ['energia', /\b(energ[ií]a|el[eé]ctric|petr[oó]le|hidrocarburo|gas natural|combustible|gasolina)/i],
  ['salud', /\b(sanitari|medicamento|cofepris|vacuna|epidemiol|inocuidad|alimentos)/i],
  ['datos_personales', /datos personales/i],
  ['anticorrupcion_pld', /\b(corrupci|lavado de dinero|operaciones con recursos)/i],
  ['competencia', /\b(competencia econ[oó]mica|concentraci[oó]n|monopol)/i],
  ['propiedad_intelectual', /\b(patente|marca registrada|propiedad intelectual|derechos de autor)/i],
]

/** Materia de la nota: la de la fuente, o la que delaten el título y la entrada si la fuente es general. */
export function classifyMateria(sourceMateria: string, title: string, summary: string | null): Materia {
  if (sourceMateria !== 'otra') return sourceMateria as Materia
  const text = `${title} ${summary ?? ''}`
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? 'otra'
}
