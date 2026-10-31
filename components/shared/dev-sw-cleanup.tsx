'use client'

import { useEffect } from 'react'

// Solo en desarrollo. Esta app no usa service workers, pero otro proyecto que
// haya corrido en el mismo puerto puede haber dejado uno registrado: el navegador
// lo conserva y sirve archivos viejos (error de hidratación, `$RS`, `/sw.js` 404).
// Lo da de baja junto con sus cachés y recarga una sola vez.
const FLAG = 'otero:sw-cleaned'

export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let cancelled = false

    async function clean() {
      const registrations = await navigator.serviceWorker.getRegistrations()
      const cacheKeys = 'caches' in window ? await caches.keys() : []
      if (cancelled || (!registrations.length && !cacheKeys.length)) return
      await Promise.all([
        ...registrations.map((registration) => registration.unregister()),
        ...cacheKeys.map((key) => caches.delete(key)),
      ])
      // Una sola recarga, para no entrar en un ciclo si algo vuelve a registrarse.
      try {
        if (sessionStorage.getItem(FLAG)) return
        sessionStorage.setItem(FLAG, '1')
      } catch {
        return
      }
      window.location.reload()
    }

    clean().catch((error) => console.error('No se pudo limpiar el service worker', error))
    return () => { cancelled = true }
  }, [])

  return null
}
