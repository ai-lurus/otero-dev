'use server'

import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUserId } from './auth-helpers'

export async function getPosts() {
  return db.select().from(posts).orderBy(desc(posts.createdAt))
}

export async function getPublishedPosts() {
  return db.select().from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
}

export async function createPost(data: {
  title: string
  body: string
  summary: string
  category: string
  priority: string
  source: string
  affectsNote?: string
  published: boolean
}) {
  const authorId = await getUserId()
  const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  await db.insert(posts).values({ ...data, id, authorId })
  revalidatePath('/admin/noticias')
  revalidatePath('/cliente/noticias')
  return id
}

export async function updatePost(id: string, data: {
  title?: string
  body?: string
  summary?: string
  category?: string
  priority?: string
  source?: string
  affectsNote?: string
  published?: boolean
}) {
  await getUserId()
  await db.update(posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(posts.id, id))
  revalidatePath('/admin/noticias')
  revalidatePath('/cliente/noticias')
}

export async function deletePost(id: string) {
  await getUserId()
  await db.delete(posts).where(eq(posts.id, id))
  revalidatePath('/admin/noticias')
  revalidatePath('/cliente/noticias')
}

export async function togglePublish(id: string, published: boolean) {
  await getUserId()
  await db.update(posts)
    .set({ published, updatedAt: new Date() })
    .where(eq(posts.id, id))
  revalidatePath('/admin/noticias')
  revalidatePath('/cliente/noticias')
}
