import Link from 'next/link'
import { getNewsSourcesAdmin } from '@/app/actions/news'
import FuentesManager from './fuentes-manager'

export default async function Page() {
  const sources = await getNewsSourcesAdmin()
  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/noticias" className="text-body-sm text-brand-text hover:underline">Volver a Noticias</Link>
        <h1 className="text-display-md text-ink">Fuentes del boletín</h1>
        <p className="text-body text-ink-muted">Salas de prensa que Otero lee tres veces al día. Pausa las que no quieras en el boletín de tus clientes.</p>
      </header>
      <FuentesManager sources={sources} />
    </div>
  )
}
