// Trae fichas de la Plataforma Integral de Gobernanza Regulatoria (PIGR) a la ingesta.
// Corre en TU computadora con TU navegador: el sitio bloquea a los agentes automáticos
// de servidores (Akamai), así que Otero no lo consulta desde Vercel. El script abre el
// Buscador en un Chromium visible, toma el texto de cada ficha nueva y lo guarda en la
// ingesta como fuente (texto en Blob + registro en ingest_sources), lista para "Procesar".
//
// Requisitos (una vez):  pnpm dlx playwright install chromium   y   pnpm add -D playwright
//                        vercel env pull .env.local   (DATABASE_URL y el acceso a Blob)
// Uso:  pnpm pigr:ingest --email tu@correo [--texto "propiedad intelectual"] [--paginas 3] [--max 30]
import { existsSync } from 'node:fs'
import { put } from '@vercel/blob'
import pg from 'pg'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const ORIGIN = 'https://www.herramientasregulatorias.gob.mx'
const email = args.email
const term = args.texto ?? ''
const maxPages = Number(args.paginas ?? 3)
const maxNew = Number(args.max ?? 30)
if (!email) { console.error('Falta --email del admin que queda como autor de las fuentes'); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL (corre vercel env pull .env.local)'); process.exit(1) }

let chromium
try { ({ chromium } = await import('playwright')) } catch {
  console.error('Falta playwright: pnpm add -D playwright && pnpm dlx playwright install chromium'); process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const sleep = (ms) => new Promise(r => setTimeout(r, ms + Math.random() * 400))
const clean = (s) => s.replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

try {
  const { rows: [admin] } = await pool.query('select id, name from "user" where lower(email) = lower($1)', [email])
  if (!admin) throw new Error(`No existe el usuario ${email}`)

  // Sitio padre para agrupar las fichas en el panel.
  const siteUrl = `${ORIGIN}/Buscador`
  let { rows: [site] } = await pool.query("select id from ingest_sources where kind = 'site' and url = $1", [siteUrl])
  if (!site) {
    ;({ rows: [site] } = await pool.query(
      "insert into ingest_sources (id, kind, title, url, status, created_by) values ($1, 'site', $2, $3, 'lista', $4) returning id",
      [`src-${crypto.randomUUID()}`, 'Plataforma de Gobernanza Regulatoria (carga local)', siteUrl, admin.id]))
  }

  const browser = await chromium.launch({ headless: false })
  const page = await (await browser.newContext({ locale: 'es-MX' })).newPage()

  // 1) Enlaces a fichas. Los resultados son un fragmento HTML que el propio sitio carga con
  //    Buscador/SearchRegulacionResult (search, page); se pide desde la página ya abierta.
  const found = new Map()
  await page.goto(`${ORIGIN}/Buscador?txtSearch=${encodeURIComponent(term)}&tab=tab1`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  for (let p = 1; p <= maxPages; p++) {
    const cards = await page.evaluate(async ({ term, p }) => {
      const res = await fetch(`/Buscador/SearchRegulacionResult?search=${encodeURIComponent(term)}&Inicio=&Final=&dep=Todos&Rango=undefined&propuesta=propuesta-todos&tab=tab1&page=${p}`, { credentials: 'include' })
      if (!res.ok) return { error: res.status }
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
      return { cards: [...doc.querySelectorAll('a[href*="AirConstancia?IdAir="]')].map(a => ({
        href: a.getAttribute('href'),
        title: (a.closest('.card')?.querySelector('h4')?.textContent || '').replace(/\s+/g, ' ').trim(),
      })) }
    }, { term, p })
    if (cards.error) { console.warn(`Página ${p}: el sitio respondió ${cards.error}`); break }
    let added = 0
    for (const l of cards.cards) {
      const id = new URL(l.href, ORIGIN).searchParams.get('IdAir')
      if (!id) continue
      const url = `${ORIGIN}/AirConstancia?IdAir=${id}&tab=tab1`
      if (!found.has(url)) { found.set(url, l.title); added++ }
    }
    console.log(`Página ${p}: ${cards.cards.length} enlaces, ${added} fichas nuevas`)
    if (added === 0) break
    await sleep(1500)
  }

  // 2) Solo las que Otero aún no tiene.
  const urls = [...found.keys()]
  const { rows: known } = await pool.query('select url from ingest_sources where url = any($1)', [urls])
  const knownSet = new Set(known.map(r => r.url))
  const unknown = urls.filter(u => !knownSet.has(u))
  const fresh = unknown.slice(0, maxNew)
  console.log(`${urls.length} fichas encontradas, ${urls.length - unknown.length} ya estaban; se guardarán ${fresh.length}`)

  // 3) Texto de cada ficha, guardado como archivo de texto en Blob.
  let saved = 0
  for (const url of fresh) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      const raw = await page.evaluate(() => document.body.innerText)
      const cut = raw.indexOf('← Salir')
      const text = clean(cut >= 0 ? raw.slice(cut + 7) : raw)
      if (text.length < 200) { console.warn(`Sin texto suficiente: ${url}`); continue }
      const title = (text.split('\n').find(l => l.trim().length > 10) ?? found.get(url) ?? url).slice(0, 200)
      const id = `src-${crypto.randomUUID()}`
      const fileName = `pigr-${new URL(url).searchParams.get('IdAir')}.txt`
      const body = `Fuente: ${url}\n\n${text}`
      const blob = await put(`ingesta/${id}/${fileName}`, body, { access: 'private', addRandomSuffix: false, contentType: 'text/plain' })
      await pool.query(
        `insert into ingest_sources (id, kind, title, url, blob_pathname, file_name, mime_type, size_bytes, parent_id, created_by)
         values ($1, 'file', $2, $3, $4, $5, 'text/plain', $6, $7, $8)`,
        [id, title, url, blob.pathname, fileName, Buffer.byteLength(body), site.id, admin.id])
      saved++
      console.log(`✓ ${title}`)
    } catch (e) {
      console.warn(`✗ ${url}: ${e.message}`)
    }
    await sleep(2500)
  }
  await browser.close()
  console.log(`Listo: ${saved} fuentes nuevas. Entra a /admin/ingesta y pulsa "Procesar pendientes".`)
} finally {
  await pool.end()
}
