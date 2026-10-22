import { getTenants, getUsersWithTenants } from '@/app/actions/admin'
import UserManager from './user-manager'

export default async function UsersPage() {
  const [tenantList, usersWithTenants] = await Promise.all([
    getTenants(),
    getUsersWithTenants(),
  ])

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea usuarios y administradores, asígnalos a una empresa y gestiona sus roles desde aquí.
        </p>
      </div>
      <UserManager tenants={tenantList} users={usersWithTenants} />
    </div>
  )
}
