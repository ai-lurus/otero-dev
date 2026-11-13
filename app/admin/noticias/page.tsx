import { getPosts } from '@/app/actions/posts'
import { getNewsAdmin } from '@/app/actions/news'
import AdminNoticiasTabs from './admin-tabs'
import BoletinAdmin from './boletin-admin'
import NoticiasManager from './noticias-manager'

export default async function Page() {
  const [allPosts, news] = await Promise.all([getPosts(), getNewsAdmin().catch(() => [])])
  return (
    <AdminNoticiasTabs
      bulletin={
        <div className="flex flex-col gap-6 p-6 lg:p-8">
          <header>
            <h1 className="text-display-md text-ink">Boletín de noticias</h1>
            <p className="mt-2 text-body text-ink-muted">Comunicados que Otero lee de las salas de prensa. Es lo que ven tus clientes en Noticias.</p>
          </header>
          <BoletinAdmin rows={news} />
        </div>
      }
      posts={<NoticiasManager initialPosts={allPosts} />}
    />
  )
}
