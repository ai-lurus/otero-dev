import { getPublishedPosts } from '@/app/actions/posts'
import { getNewsBulletin } from '@/app/actions/news'
import Boletin from './boletin'
import NoticiasTabs from './noticias-tabs'
import ClienteNoticiasClient from './noticias-client'

export default async function Page() {
  const [posts, bulletin] = await Promise.all([
    getPublishedPosts(),
    getNewsBulletin().catch(() => ({ cards: [], canCreate: false })),
  ])
  return (
    <NoticiasTabs
      bulletin={
        <div className="flex flex-col gap-6 p-6">
          <header>
            <h1 className="text-display-md text-ink">Noticias</h1>
            <p className="mt-2 text-body text-ink-muted">Comunicados de las dependencias, ordenados por lo que le toca a tu empresa.</p>
          </header>
          <Boletin cards={bulletin.cards} canCreate={bulletin.canCreate} />
        </div>
      }
      posts={<ClienteNoticiasClient posts={posts} />}
    />
  )
}
