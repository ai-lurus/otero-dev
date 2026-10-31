import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles, posts, regulatoryItems } from '@/lib/db/schema'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { getFirstTenantId } from '@/app/actions/auth-helpers'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const messages: UIMessage[] = body.messages ?? []
    // Pantalla desde la que pregunta; solo se usa como contexto, nunca para decidir permisos.
    const pathname = typeof body.pathname === 'string' ? body.pathname.slice(0, 120) : ''

    // Load company profile and recent published posts for context
    let companyContext = ''
    let newsContext = ''
    let itemsContext = ''

    try {
      const tenantId = await getFirstTenantId()
      if (tenantId) {
        const tdb = await getTenantDb(tenantId)
        const [profile, recentPosts, items] = await Promise.all([
          tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1),
          db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.createdAt)).limit(10),
          // Solo lo que ya le llegó a esta empresa y sigue abierto.
          tdb.select().from(regulatoryItems)
            .where(and(eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt), inArray(regulatoryItems.status, ['identificada', 'aceptada'])))
            .orderBy(desc(regulatoryItems.updatedAt)).limit(25),
        ])

        if (items.length > 0) {
          itemsContext = items.map((item) =>
            `- ${item.title} | ${item.status === 'identificada' ? 'sin revisar' : 'aceptado'} | ${item.source}${item.publishedAt ? ` ${item.publishedAt}` : ''}${item.authority ? ` · ${item.authority}` : ''} | materia: ${item.materia} | impacto: ${item.impact ?? 'sin evaluar'} | plazo: ${item.dueDate ?? 'sin plazo'}${item.owner ? ` | responsable: ${item.owner}` : ''}`
          ).join('\n')
        }

        if (profile[0]) {
          const p = profile[0]
          companyContext = [
            p.description    && `Descripción: ${p.description}`,
            p.industry       && `Industria: ${p.industry}`,
            p.employees      && `Empleados: ${p.employees}`,
            p.states         && `Estados donde opera: ${p.states}`,
            p.activities     && `Actividades principales: ${p.activities}`,
            p.certifications && `Certificaciones: ${p.certifications}`,
            p.riesgos        && `Riesgos regulatorios conocidos: ${p.riesgos}`,
          ].filter(Boolean).join('\n')
        }

        if (recentPosts.length > 0) {
          newsContext = recentPosts.map(p =>
            `[${p.category.toUpperCase()} · ${p.source} · ${new Date(p.createdAt).toLocaleDateString('es-MX')}]\n` +
            `Título: ${p.title}\n` +
            `Resumen: ${p.summary}\n` +
            (p.affectsNote ? `Impacto: ${p.affectsNote}` : '')
          ).join('\n\n')
        }
      }
    } catch {
      // Non-fatal — proceed without context
    }

    const today = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' }).format(new Date())
    const systemPrompt = `Eres Otero, el asistente de la plataforma de monitoreo regulatorio Otero, para empresas en México. Hablas con el directivo o el equipo de una empresa cliente.

Tu función es ayudarle a entender qué cambios regulatorios le tocan, qué debe atender primero y por qué. Cuando te pregunten qué atender, ordena por plazo e impacto y da el motivo.

Reglas:
- Responde en español, de tú, con frases cortas y verbo primero. Sin exclamaciones ni emojis.
- Usa solo los datos que aparecen abajo. Si algo no está, dilo y no lo inventes. Nunca inventes artículos, fechas ni plazos.
- Cada afirmación sobre un asunto lleva su fuente, por ejemplo "DOF 02/10/2026", y su plazo si lo tiene.
- No das asesoría legal definitiva: para decisiones importantes sugiere revisarlas con su abogado, pero sin sustituir el dato.
- Si una noticia no aplica a la empresa, dilo.

Hoy es ${today}.${pathname ? `\nLa persona está en la pantalla ${pathname} del portal.` : ''}${itemsContext ? `\n\nASUNTOS DE REGWATCH DE LA EMPRESA (abiertos):\n${itemsContext}` : '\n\nLa empresa no tiene asuntos abiertos en RegWatch.'}${companyContext ? `\n\nPERFIL DE LA EMPRESA:\n${companyContext}` : ''}${newsContext ? `\n\nNOTICIAS REGULATORIAS RECIENTES:\n${newsContext}` : ''}`

    const result = streamText({
      model: 'google/gemini-2.5-flash',
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('[v0] Compi route error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
