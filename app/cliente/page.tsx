import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getRegulatoryItems } from "@/app/actions/regulatory-items"
import { getCurrentTenantName } from "@/app/actions/auth-helpers"
import DashboardClient from "./dashboard-client"

export default async function ClienteHomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const [obligations, accountName] = await Promise.all([
    getRegulatoryItems().catch(() => []),
    getCurrentTenantName().catch(() => null),
  ])
  const referenceDate = new Date().toISOString().slice(0, 10)
  return <DashboardClient obligations={obligations} accountName={accountName ?? "Tu empresa"} referenceDate={referenceDate} />
}
