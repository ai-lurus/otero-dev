import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Suspense } from 'react'
import { getTenantBySlug } from '@/app/actions/admin'
import { TenantLoginForm } from './tenant-login-form'

export default async function TenantLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant) notFound()

  return (
    <main className="min-h-screen flex bg-ink">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative flex-col overflow-hidden">
        <Image src="/images/login-hero.png" alt="Legal office" fill className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-ink/70" />
        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface/[0.1] flex items-center justify-center">
              <svg className="w-4 h-4 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-serif text-surface text-lg font-semibold tracking-[-0.01em]">Otero</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-surface/40 mb-4">Portal de cliente</p>
            <h1 className="font-serif text-4xl xl:text-5xl font-semibold text-surface leading-tight text-balance">
              {tenant.name}
            </h1>
            <p className="mt-4 text-sm text-surface/50 leading-relaxed max-w-xs">
              Accede a tu portal de compliance regulatorio administrado por Otero.
            </p>
            {tenant.industry && (
              <div className="mt-8">
                <span className="text-[10px] font-semibold tracking-wide px-3 py-1.5 rounded-full bg-surface/8 border border-surface/12 text-surface/50">
                  {tenant.industry}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-14 xl:px-20 py-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 rounded-lg bg-surface/[0.1] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="font-serif text-surface text-base font-semibold tracking-[-0.01em]">Otero</span>
        </div>

        <Suspense fallback={null}>
          <TenantLoginForm tenantId={tenant.id} tenantName={tenant.name} />
        </Suspense>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-surface/12 text-[10px] tracking-widest uppercase whitespace-nowrap">
          otero.ai &nbsp;·&nbsp; Compliance &amp; Legal Platform
        </p>
      </div>
    </main>
  )
}
