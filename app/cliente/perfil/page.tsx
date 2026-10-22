import { redirect } from "next/navigation"
import { getCompanyProfileForCurrentUser } from "@/app/actions/company-profile"
import PerfilClient from "./perfil-client"

export default async function PerfilPage() {
  try {
    const data = await getCompanyProfileForCurrentUser()
    return <PerfilClient user={data.user} profile={data.profile} />
  } catch {
    redirect("/sign-in")
  }
}
