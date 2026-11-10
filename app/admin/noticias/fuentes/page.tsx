import Link from 'next/link'
import { getNewsSourcesAdmin } from '@/app/actions/news-sources'
import FuentesManager from './fuentes-manager'

// "Leer ahora" corre como server action y hereda este límite; 60 s es el máximo del plan free.
export const maxDuration = 60

export default async function Page() {
  const sources = await getNewsSourcesAdmin()
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <Link href="/admin/noticias" className="text-body-sm text-brand-text hover:underline">Volver a Noticias</Link>
        <h1 className="text-display-md text-ink">Fuentes del boletín</h1>
        <p className="text-body text-ink-muted">Salas de prensa que Otero lee tres veces al día. Agrega, corrige o pausa las que alimentan el boletín de tus clientes.</p>
      </header>
      <FuentesManager sources={sources} />
    </div>
  )
}
