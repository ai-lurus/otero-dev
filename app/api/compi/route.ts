import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { companyProfiles, posts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
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

    // Load company profile and recent published posts for context
    let companyContext = ''
    let newsContext = ''

    try {
      const tenantId = await getFirstTenantId()
      if (tenantId) {
        const [profile, recentPosts] = await Promise.all([
          db.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1),
          db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.createdAt)).limit(10),
        ])

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

    const systemPrompt = `Eres Compi, el asistente de inteligencia artificial de Otero, una plataforma de compliance legal y regulatorio para empresas en México.

Tu función es ayudar al usuario a entender cómo las novedades regulatorias y normativas publicadas en el radar de Otero se relacionan específicamente con su empresa.

Eres experto en:
- NOMs (Normas Oficiales Mexicanas)
- DOF (Diario Oficial de la Federación)
- SEMARNAT, PROFEPA, SAT, IMSS, STPS y demás autoridades mexicanas
- Compliance ambiental, fiscal, laboral y corporativo

Responde siempre en español. Sé claro, directo y práctico. Si una noticia no aplica a la empresa, dilo. Si hay un riesgo relevante, explícalo con acciones concretas.${companyContext ? `\n\nPERFIL DE LA EMPRESA:\n${companyContext}` : ''}${newsContext ? `\n\nNOTICIAS REGULATORIAS RECIENTES:\n${newsContext}` : ''}`

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
