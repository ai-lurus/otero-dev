import { getPublishedPosts } from '@/app/actions/posts'
import ClienteNoticiasClient from './noticias-client'

export default async function Page() {
  const posts = await getPublishedPosts()
  return <ClienteNoticiasClient posts={posts} />
}
