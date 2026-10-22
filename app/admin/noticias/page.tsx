import { getPosts } from '@/app/actions/posts'
import NoticiasManager from './noticias-manager'

export default async function Page() {
  const allPosts = await getPosts()
  return <NoticiasManager initialPosts={allPosts} />
}
