import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth-helpers'
import { isTenantAdmin, listMyTenantPermissions, listMyTenantUsers } from '@/app/actions/tenant-users'
import UsuariosClient from './usuarios-client'

export default async function UsuariosPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  if (!(await isTenantAdmin())) redirect('/cliente')
  const [users, permissions] = await Promise.all([listMyTenantUsers(), listMyTenantPermissions()])

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea y administra a las personas de tu empresa que usan el portal y decide a qué pantallas y acciones tiene acceso cada una.
        </p>
      </div>
      <UsuariosClient users={users} meId={session.user.id} permissions={permissions} />
    </div>
  )
}
