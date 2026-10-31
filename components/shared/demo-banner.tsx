// Alto fijo del banner: las pantallas lo restan de su 100vh con --banner-h.
export const DEMO_BANNER_HEIGHT = '1.75rem'

export default function DemoBanner() {
  return (
    <div
      role="note"
      style={{ height: DEMO_BANNER_HEIGHT }}
      className="sticky top-0 z-[9998] flex w-full items-center justify-center bg-warn px-4 text-center text-xs font-semibold text-warn-text"
    >
      Demo con datos ficticios
    </div>
  )
}
