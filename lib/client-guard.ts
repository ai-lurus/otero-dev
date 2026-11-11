import { isTenantAdmin } from '@/app/actions/tenant-users'

// Candado de servidor para lo que solo hace el director de la empresa cliente.
// No es un archivo 'use server': nada de aquí se expone al navegador.

/** Lanza Forbidden si quien llama no es el director (tenant_admin) de su empresa. */
export async function requireDirector() {
  if (!(await isTenantAdmin())) throw new Error('Forbidden')
}
