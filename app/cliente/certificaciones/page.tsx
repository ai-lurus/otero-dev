import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import { getCertifications } from '@/app/actions/certifications'
import CertificationsClient from './certifications-client'

export default async function CertificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  if (!(await isTenantAdmin())) redirect('/cliente')
  const certifications = await getCertifications().catch(() => [])
  return <CertificationsClient initialCertifications={certifications} />
}
