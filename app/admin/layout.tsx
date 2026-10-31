import { AdminSidebar } from '@/components/admin/sidebar'
import { redirect } from 'next/navigation'
import { getSession, isAdminUser } from '@/app/actions/auth-helpers'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in?callbackUrl=/admin')
  if (!(await isAdminUser())) redirect('/cliente')

  return (
    <div className="portal-shell portal-shell-admin flex min-h-screen min-w-0 overflow-x-clip bg-background">
      <AdminSidebar />
      <main className="portal-main w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
