import { redirect } from "next/navigation"
import { getCompanyProfileForCurrentUser } from "@/app/actions/company-profile"
import { isTenantAdmin } from "@/app/actions/tenant-users"
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
  const canEdit = await isTenantAdmin()
  return (
    <PerfilClient user={data.user} profile={data.profile} canEdit={canEdit} initialTab={tab === "empresa" ? "empresa" : "cuenta"}>
      <MonitoringSection profile={data.profile} canEdit={canEdit} />
    </PerfilClient>
  )
}
