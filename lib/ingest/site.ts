import { IngestError } from './errors'
import { decodeBody, fetchRemote, htmlToText, readCapped } from './extract'
import { isAllowedByRobots } from './robots'
import { DOF_HOSTS } from './dof'

// Sitios recurrentes genéricos: una página de listado (o un feed RSS/Atom) de
// la que se toman los enlaces a publicaciones. El DOF tiene su propio lector
// por sumario diario (lib/ingest/dof.ts).

export type SiteLink = { url: string; title: string }

export const isDofHost = (hostname: string) => DOF_HOSTS.includes(hostname)

const MAX_LIST_BYTES = 5 * 1024 * 1024
// Enlaces que nunca son publicaciones: recursos, imágenes y descargas de formato de oficina.
const SKIP_EXT = /\.(css|js|json|png|jpe?g|gif|svg|webp|ico|zip|rar|mp3|mp4|xml)(\?|$)/i

/** Filtro tipo comodín ("*\/normas/*", "nota_detalle") sobre la URL completa, sin distinguir mayúsculas. */
export function filterToRegExp(filter: string): RegExp {
  const body = filter.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(body, 'i')
}

function isFeed(text: string, contentType: string) {
  return /(rss|atom)\+xml|\/xml/.test(contentType) || /^\s*(<\?xml[^>]*>\s*)?<(rss|feed|rdf:RDF)\b/i.test(text)
}

function cdata(s: string) {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
}

export function parseFeed(xml: string, base: URL): SiteLink[] {
  const out: SiteLink[] = []
  for (const m of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
    const block = m[0]
    const raw = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
      ?? block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1]
      ?? block.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/i)?.[1]
    if (!raw) continue
    const title = htmlToText(cdata(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')).text
    try { out.push({ url: new URL(cdata(raw).trim().replace(/&amp;/g, '&'), base).toString(), title }) } catch { /* enlace inválido */ }
  }
  return out
}

export function parseListing(html: string, base: URL): SiteLink[] {
  const out: SiteLink[] = []
  // Se ignoran menús y pies de página, que repiten los mismos enlaces en todo el sitio.
  const body = html.replace(/<(script|style|noscript|nav|footer|header)\b[\s\S]*?<\/\1>/gi, ' ')
  for (const m of body.matchAll(/<a\s[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].replace(/&amp;/g, '&').trim()
    if (/^(mailto|tel|javascript):/i.test(href)) continue
    const title = htmlToText(m[2]).text.replace(/\s+/g, ' ').trim()
    try { out.push({ url: new URL(href, base).toString(), title }) } catch { /* enlace inválido */ }
  }
  return out
}

/**
 * Lee el listado y devuelve los enlaces candidatos (sin repetir) y cuántos se
 * descartaron por robots.txt. Sin filtro solo se toman enlaces del mismo
 * dominio con texto de al menos 15 caracteres, que es lo típico de un título.
 */
export async function fetchSiteLinks(listUrl: string, linkFilter: string | null): Promise<{ links: SiteLink[]; blocked: number }> {
  const res = await fetchRemote(listUrl)
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
  const text = decodeBody(await readCapped(res.body, MAX_LIST_BYTES), contentType)
  const base = new URL(res.url || listUrl)
  const feed = isFeed(text, contentType)
  const raw = feed ? parseFeed(text, base) : parseListing(text, base)

  const re = linkFilter?.trim() ? filterToRegExp(linkFilter) : null
  const self = new URL(listUrl).toString()
  const byUrl = new Map<string, SiteLink>()
  for (const l of raw) {
    const u = new URL(l.url)
    u.hash = ''
    const href = u.toString()
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    if (href === self || href === base.toString() || SKIP_EXT.test(u.pathname)) continue
    if (re) { if (!re.test(href)) continue }
    else if (!feed && (u.hostname !== base.hostname || l.title.length < 15)) continue
    const prev = byUrl.get(href)
    // Un mismo enlace puede aparecer varias veces (ícono + título); se conserva el texto más largo.
    if (!prev || l.title.length > prev.title.length) byUrl.set(href, { url: href, title: l.title.slice(0, 200) || u.hostname + u.pathname })
  }

  const links: SiteLink[] = []
  let blocked = 0
  for (const l of byUrl.values()) {
    if (await isAllowedByRobots(new URL(l.url))) links.push(l)
    else blocked++
  }
  if (links.length === 0) {
    throw new IngestError(blocked
      ? 'Los enlaces del listado están prohibidos por el robots.txt del sitio'
      : 'No se encontraron enlaces a publicaciones en esa página; prueba con otro listado o ajusta el filtro')
  }
  return { links, blocked }
}
