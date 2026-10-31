import type { Metadata } from 'next'
import { Instrument_Sans, Fraunces, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import './otero.css'
import DemoBanner, { DEMO_BANNER_HEIGHT } from '@/components/shared/demo-banner'
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
    <html
      lang="es"
      className={`${instrument.variable} ${fraunces.variable} ${plex.variable} bg-background`}
      // Las pantallas miden 100vh menos el banner, para que no aparezca scroll de más.
      style={isDemoMode ? ({ '--banner-h': DEMO_BANNER_HEIGHT } as React.CSSProperties) : undefined}
    >
      <body className="font-sans antialiased">
        {isDemoMode && <DemoBanner />}
        {children}
      </body>
    </html>
  )
}
