import { IngestError } from './errors'

// Nombre con el que nos identificamos; las reglas de este agente tienen prioridad sobre "*".
export const BOT_NAME = 'OteroBot'
export const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_NAME}/1.0; +https://otero-dev.vercel.app)`

type Rule = { allow: boolean; pattern: string }
type Cached = { rules: Rule[]; at: number }

const TTL_MS = 60 * 60 * 1000
const cache = new Map<string, Cached>()

export function parseRobots(txt: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = []
  let current: { agents: string[]; rules: Rule[] } | null = null
  let lastWasAgent = false
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current) }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else if ((field === 'allow' || field === 'disallow') && current) {
      lastWasAgent = false
      if (value) current.rules.push({ allow: field === 'allow', pattern: value })
    } else {
      lastWasAgent = false
    }
  }
  const mine = groups.filter(g => g.agents.includes(BOT_NAME.toLowerCase()))
  const chosen = mine.length ? mine : groups.filter(g => g.agents.includes('*'))
  return chosen.flatMap(g => g.rules)
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

/** Regla más específica (patrón más largo) gana; en empate, Allow. */
export function isAllowedByRules(rules: Rule[], pathAndQuery: string): boolean {
  let best: { len: number; allow: boolean } | null = null
  for (const r of rules) {
    if (!patternToRegExp(r.pattern).test(pathAndQuery)) continue
    const len = r.pattern.length
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow }
  }
  return best ? best.allow : true
}

async function loadRules(origin: string): Promise<Rule[]> {
  const hit = cache.get(origin)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rules
  let rules: Rule[]
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': USER_AGENT },
    })
    if (res.status >= 500) throw new Error(String(res.status))
    // Sin robots.txt (4xx) significa que no hay restricciones.
    rules = res.ok ? parseRobots((await res.text()).slice(0, 500_000)) : []
  } catch {
    throw new IngestError('No se pudo verificar el robots.txt del sitio; por precaución no se leyó')
  }
  cache.set(origin, { rules, at: Date.now() })
  return rules
}

export async function assertAllowedByRobots(url: URL) {
  const rules = await loadRules(url.origin)
  if (!isAllowedByRules(rules, url.pathname + url.search)) {
    throw new IngestError('El sitio no permite que robots lean esta página (robots.txt); procésala manualmente')
  }
}
