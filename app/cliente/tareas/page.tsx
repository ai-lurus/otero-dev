import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMyTasks } from '@/app/actions/tasks'
import { MyTasks } from '@/components/tasks/my-tasks'

export default async function TareasPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const { tasks, team, isDirector } = await getMyTasks()
  return (
    <main className="min-h-screen bg-surface text-ink">
      <MyTasks tasks={tasks} team={team} isDirector={isDirector} />
    </main>
  )
}
