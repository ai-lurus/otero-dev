import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { getRegulatoryItems } from "@/app/actions/regulatory-items"
import { getCurrentTenantName } from "@/app/actions/auth-helpers"
import { needsOnboarding } from "@/app/actions/onboarding"
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner"
import { HomeSkeleton } from "@/components/shared/skeletons"
import DashboardClient from "./dashboard-client"

async function ClienteHome() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const [obligations, accountName, pendingOnboarding] = await Promise.all([
    getRegulatoryItems().catch(() => []),
    getCurrentTenantName().catch(() => null),
    needsOnboarding(),
  ])
  const referenceDate = new Date().toISOString().slice(0, 10)
  return (
    <>
      {pendingOnboarding && <OnboardingBanner />}
      <DashboardClient obligations={obligations} accountName={accountName ?? "Tu empresa"} referenceDate={referenceDate} />
    </>
  )
}

export default function ClienteHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <ClienteHome />
    </Suspense>
  )
}
