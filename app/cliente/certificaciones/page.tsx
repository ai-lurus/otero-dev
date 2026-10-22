import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCertifications } from '@/app/actions/certifications'
import CertificationsClient from './certifications-client'

export default async function CertificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const certifications = await getCertifications().catch(() => [])
  return <CertificationsClient initialCertifications={certifications} />
}
