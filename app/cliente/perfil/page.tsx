import { redirect } from "next/navigation"
import { getCompanyProfileForCurrentUser } from "@/app/actions/company-profile"
import { getMyScreenPermissions } from "@/app/actions/access"
import PerfilClient from "./perfil-client"
import MonitoringSection from "./monitoring-section"

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  let data: Awaited<ReturnType<typeof getCompanyProfileForCurrentUser>>
  try {
    data = await getCompanyProfileForCurrentUser()
  } catch {
    redirect("/sign-in")
  }
  const canEdit = (await getMyScreenPermissions("perfil")).edit
  return (
    <PerfilClient user={data.user} profile={data.profile} canEdit={canEdit} initialTab={tab === "empresa" ? "empresa" : "cuenta"}>
      <MonitoringSection profile={data.profile} canEdit={canEdit} />
    </PerfilClient>
  )
}
