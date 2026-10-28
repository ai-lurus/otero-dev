import type { Metadata } from 'next'
import { Instrument_Sans, Fraunces, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import './otero.css'
import DemoBanner from '@/components/shared/demo-banner'
import { isDemoMode } from '@/lib/demo'

const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['600'] })
const plex = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex', weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Otero — Cumplimiento regulatorio en automático',
  description: 'Otero vigila la regulación que aplica a tu empresa y resuelve contigo permisos, reportes, plazos y evidencia.',
  ...(isDemoMode ? { robots: { index: false, follow: false } } : {}),
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${instrument.variable} ${fraunces.variable} ${plex.variable} bg-background`}>
      <body className="font-sans antialiased">
        {isDemoMode && <DemoBanner />}
        {children}
        <a
          href="https://ivolvlab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1 rounded-full bg-ink/5 border border-ink/8 px-2.5 py-1 text-[10px] text-ink/30 hover:text-ink/50 hover:bg-ink/8 transition-all select-none"
          aria-label="Hecho por ivolvlab.com"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
            <circle cx="5" cy="5" r="4.5" stroke="currentColor" strokeWidth="1"/>
            <path d="M3.5 5.5L4.5 6.5L6.5 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          ivolvlab.com
        </a>
      </body>
    </html>
  )
}
