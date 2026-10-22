'use client'

import { createAuthClient } from 'better-auth/react'

// In the v0 preview the app runs on localhost:3000 but is embedded in an iframe
// served from a different origin. We always point the client at the app server.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
})
