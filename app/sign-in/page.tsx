import { redirect } from 'next/navigation'
import { getSession, getHomePath } from '@/app/actions/auth-helpers'
import AuthForm from '@/components/auth-form'

export default async function SignInPage() {
  const session = await getSession()
  if (session?.user) redirect(await getHomePath())
  return <AuthForm />
}
